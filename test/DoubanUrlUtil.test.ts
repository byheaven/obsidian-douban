import DoubanUrlUtil from "../src/org/wanxp/utils/DoubanUrlUtil";
import {SupportType} from "../src/org/wanxp/constant/Constsant";

jest.mock("obsidian", () => ({getLanguage: () => "en"}), {virtual: true});

describe("DoubanUrlUtil", () => {
	it.each([
		["https://movie.douban.com/subject/3742360", SupportType.movie],
		["https://book.douban.com/subject/2567698/", SupportType.book],
		["https://music.douban.com/subject/1234567/", SupportType.music],
		["https://www.douban.com/game/1234567/", SupportType.game],
		["https://www.douban.com/location/drama/36564284/", SupportType.theater],
	])("parses %s", (url, type) => {
		expect(DoubanUrlUtil.parse(url)).toMatchObject({type});
	});

	it("rejects non-Douban and malformed URLs", () => {
		expect(DoubanUrlUtil.parse("https://example.com/subject/1234567")).toBeNull();
		expect(DoubanUrlUtil.parse("not a url")).toBeNull();
	});
});
