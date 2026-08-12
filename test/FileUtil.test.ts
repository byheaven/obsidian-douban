import {FileUtil} from "../src/org/wanxp/utils/FileUtil";

jest.mock("obsidian", () => ({normalizePath: (value: string) => value}), {virtual: true});

describe("FileUtil", () => {
	it("keeps legal spaces while replacing path separators and control whitespace", () => {
		expect(FileUtil.replaceSpecialCharactersForFileName("Under the Skin: A Novel"))
			.toBe("Under the Skin_ A Novel");
		expect(FileUtil.replaceSpecialCharactersForFileName("line one\nline two\tend"))
			.toBe("line one_line two_end");
	});
});
