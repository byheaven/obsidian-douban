let language = "en";

jest.mock("obsidian", () => ({getLanguage: () => language}), {virtual: true});

import I18nHelper from "../src/org/wanxp/lang/helper";
import {SearchTypeRecords, SupportType} from "../src/org/wanxp/constant/Constsant";
import {DoubanSubjectState, DoubanSubjectStateRecords_BOOK} from "../src/org/wanxp/constant/DoubanUserState";

describe("I18nHelper", () => {
	it("reads the Obsidian language dynamically", () => {
		const helper = new I18nHelper();
		expect(helper.getMessage("BOOK")).toBe("book");
		expect(SearchTypeRecords[SupportType.book]).toBe("book");
		expect(DoubanSubjectStateRecords_BOOK[DoubanSubjectState.wish]).toBe("wish");
		language = "zh-CN";
		expect(helper.getMessage("BOOK")).toBe("书籍");
		expect(SearchTypeRecords[SupportType.book]).toBe("书籍");
		expect(DoubanSubjectStateRecords_BOOK[DoubanSubjectState.wish]).toBe("想读");
	});
});
