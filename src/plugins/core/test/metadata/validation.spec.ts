import { initFileProvider, initHttpClientProvider, parseHttp } from '../../../../test/testUtils';

describe('metadata.validation', () => {
  beforeEach(() => {
    initFileProvider();
  });

  describe('self-reference detection', () => {
    it('throws error when region has @name and @ref to same name', async () => {
      await expect(parseHttp(`
# @name foo
# @ref foo
GET /api
      `)).rejects.toThrow(/Self-reference detected.*"foo".*@ref\/@forceRef to itself/);
    });

    it('throws error when region has @name and @forceRef to same name', async () => {
      await expect(parseHttp(`
# @name bar
# @forceRef bar
POST /api
      `)).rejects.toThrow(/Self-reference detected.*"bar".*@ref\/@forceRef to itself/);
    });

    it('allows ref to different name', async () => {
      const httpFile = await parseHttp(`
# @name first
GET /first

###
# @name second
# @ref first
GET /second
      `);
      expect(httpFile.httpRegions).toHaveLength(2);
    });

    it('detects self-reference even with multiple refs', async () => {
      await expect(parseHttp(`
# @name target
GET /first

###
# @name test
# @ref target
# @forceRef test
GET /second
      `)).rejects.toThrow(/Self-reference detected.*"test"/);
    });
  });

  describe('circular reference detection', () => {
    it('throws error for direct circular reference (A -> B -> A)', async () => {
      // The cycle is detected when parsing B, so the error shows B -> A -> B
      await expect(parseHttp(`
# @name A
# @ref B
GET /a

###
# @name B
# @ref A
GET /b
      `)).rejects.toThrow(/Circular reference detected.*B -> A -> B/);
    });

    it('throws error for longer circular chain (A -> B -> C -> A)', async () => {
      // The cycle is detected when parsing C, so the error shows C -> A -> B -> C
      await expect(parseHttp(`
# @name A
# @ref B
GET /a

###
# @name B
# @ref C
GET /b

###
# @name C
# @ref A
GET /c
      `)).rejects.toThrow(/Circular reference detected.*C -> A -> B -> C/);
    });

    it('allows valid reference chains without cycles', async () => {
      const httpFile = await parseHttp(`
# @name setup
GET /setup

###
# @name middle
# @ref setup
GET /middle

###
# @name final
# @ref middle
GET /final
      `);
      expect(httpFile.httpRegions).toHaveLength(3);
    });

    it('allows diamond-shaped dependencies (not a cycle)', async () => {
      // A -> B, A -> C, B -> D, C -> D is NOT a cycle
      const httpFile = await parseHttp(`
# @name D
GET /d

###
# @name B
# @ref D
GET /b

###
# @name C
# @ref D
GET /c

###
# @name A
# @ref B
# @ref C
GET /a
      `);
      expect(httpFile.httpRegions).toHaveLength(4);
    });

    it('detects cycle involving forceRef', async () => {
      // The cycle is detected when parsing Y, so the error shows Y -> X -> Y
      await expect(parseHttp(`
# @name X
# @forceRef Y
GET /x

###
# @name Y
# @forceRef X
GET /y
      `)).rejects.toThrow(/Circular reference detected.*Y -> X -> Y/);
    });
  });

  describe('runtime ref guards', () => {
    it('handles missing ref gracefully with error', async () => {
      initHttpClientProvider();
      const httpFile = await parseHttp(`
# @name test
# @ref nonexistent
GET /api
      `);

      // Execute should fail with "not found" error
      const region = httpFile.httpRegions[0];
      const result = await region.execute({
        variables: {},
        httpFile,
        options: {},
      });

      expect(result).toBe(false);
      expect(region.testResults?.[0]?.message).toContain('ref nonexistent not found');
    });
  });
});
