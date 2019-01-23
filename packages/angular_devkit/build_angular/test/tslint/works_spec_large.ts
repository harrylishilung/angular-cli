/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { DefaultTimeout, TestLogger, runTargetSpec } from '@angular-devkit/architect/testing';
import { normalize, virtualFs } from '@angular-devkit/core';
import { EMPTY } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TslintBuilderOptions } from '../../src';
import { host, tslintTargetSpec } from '../utils';

// tslint:disable-next-line:no-big-function
describe('Tslint Target', () => {
  const filesWithErrors = { 'src/foo.ts': 'const foo = "";\n' };

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    runTargetSpec(host, tslintTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it(`should show project name when formatter is human readable`, (done) => {
    const logger = new TestLogger('lint-info');

    runTargetSpec(host, tslintTargetSpec, undefined, undefined, logger).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(logger.includes('Linting "app"...')).toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it(`should not show project name when formatter is non human readable`, (done) => {
    const logger = new TestLogger('lint-info');

    runTargetSpec(host, tslintTargetSpec, { format: 'checkstyle' }, undefined, logger).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(logger.includes('Linting "app"...')).toBe(false);
        expect(logger.includes('<checkstyle')).toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('should report lint error once', (done) => {
    host.writeMultipleFiles({'src/app/app.component.ts': 'const foo = "";\n' });
    const logger = new TestLogger('lint-error');

    runTargetSpec(host, tslintTargetSpec, undefined, DefaultTimeout, logger).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(false)),
      tap(() => {
        // this is to make sure there are no duplicates
        expect(logger.includes(`" should be \'\nERROR`)).toBe(false);

        expect(logger.includes(`" should be '`)).toBe(true);
        expect(logger.includes(`Lint errors found in the listed files`)).toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('supports exclude with glob', (done) => {
    host.writeMultipleFiles(filesWithErrors);
    const overrides: Partial<TslintBuilderOptions> = { exclude: ['**/foo.ts'] };

    runTargetSpec(host, tslintTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('supports exclude with relative paths', (done) => {
    host.writeMultipleFiles(filesWithErrors);
    const overrides: Partial<TslintBuilderOptions> = { exclude: ['src/foo.ts'] };

    runTargetSpec(host, tslintTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it(`supports exclude with paths starting with './'`, (done) => {
    host.writeMultipleFiles(filesWithErrors);
    const overrides: Partial<TslintBuilderOptions> = { exclude: ['./src/foo.ts'] };

    runTargetSpec(host, tslintTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('supports fix', (done) => {
    host.writeMultipleFiles(filesWithErrors);
    const overrides: Partial<TslintBuilderOptions> = { fix: true };

    runTargetSpec(host, tslintTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = normalize('src/foo.ts');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(fileName));
        expect(content).toContain(`const foo = '';`);
      }),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('supports force', (done) => {
    host.writeMultipleFiles(filesWithErrors);
    const logger = new TestLogger('lint-force');
    const overrides: Partial<TslintBuilderOptions> = { force: true };

    runTargetSpec(host, tslintTargetSpec, overrides, DefaultTimeout, logger).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(logger.includes(`" should be '`)).toBe(true);
        expect(logger.includes(`Lint errors found in the listed files`)).toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('supports format', (done) => {
    host.writeMultipleFiles(filesWithErrors);
    const logger = new TestLogger('lint-format');
    const overrides: Partial<TslintBuilderOptions> = { format: 'stylish' };

    runTargetSpec(host, tslintTargetSpec, overrides, DefaultTimeout, logger).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(false)),
      tap(() => {
        expect(logger.includes(`quotemark`)).toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('supports finding configs', (done) => {
    host.writeMultipleFiles({
      'src/app/foo/foo.ts': `const foo = '';\n`,
      'src/app/foo/tslint.json': `
        {
          "rules": {
            "quotemark": [
              true,
              "double"
            ]
          }
        }
      `,
    });
    const overrides: Partial<TslintBuilderOptions> = { tslintConfig: undefined };

    runTargetSpec(host, tslintTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(false)),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('supports overriding configs', (done) => {
    host.writeMultipleFiles({
      'src/app/foo/foo.ts': `const foo = '';\n`,
      'src/app/foo/tslint.json': `
        {
          "rules": {
            "quotemark": [
              true,
              "double"
            ]
          }
        }
      `,
    });
    const overrides: Partial<TslintBuilderOptions> = { tslintConfig: 'tslint.json' };

    runTargetSpec(host, tslintTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('supports using files with no project', (done) => {
    const overrides: Partial<TslintBuilderOptions> = {
      tsConfig: undefined,
      files: ['src/app/**/*.ts'],
    };

    runTargetSpec(host, tslintTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('supports using one project as a string', (done) => {
    const overrides: Partial<TslintBuilderOptions> = {
      tsConfig: 'src/tsconfig.app.json',
    };

    runTargetSpec(host, tslintTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('supports using one project as an array', (done) => {
    const overrides: Partial<TslintBuilderOptions> = {
      tsConfig: ['src/tsconfig.app.json'],
    };

    runTargetSpec(host, tslintTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('supports using two projects', (done) => {
    const overrides: Partial<TslintBuilderOptions> = {
      tsConfig: ['src/tsconfig.app.json', 'src/tsconfig.spec.json'],
    };

    runTargetSpec(host, tslintTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('works when a file is only part of one project when using two program', (done) => {
    const overrides: Partial<TslintBuilderOptions> = {
      tsConfig: ['src/tsconfig.app.json', 'src/tsconfig.spec.json'],
      files: ['src/foo/foo.component.ts'],
    };

    host.writeMultipleFiles({ 'src/foo/foo.component.ts': `const foo = '';\n` });

    runTargetSpec(host, tslintTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('errors when file is not part of any typescript program', (done) => {
    const overrides: Partial<TslintBuilderOptions> = {
      tsConfig: ['src/tsconfig.spec.json'],
      files: ['src/foo/foo.component.ts'],
    };

    host.writeMultipleFiles({ 'src/foo/foo.component.ts': `const foo = '';\n` });

    runTargetSpec(host, tslintTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(false)),
      catchError((err) => {
        expect(err).toMatch(`foo.component.ts' is not part of a TypeScript project`);

        return EMPTY;
      }),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('errors when type checking is used without a project', (done) => {
    const overrides: Partial<TslintBuilderOptions> = {
      tsConfig: undefined,
      typeCheck: true,
    };

    runTargetSpec(host, tslintTargetSpec, overrides)
      .subscribe(undefined, () => done(), done.fail);
  }, 30000);
});
