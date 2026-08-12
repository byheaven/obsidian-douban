jest.mock("obsidian", () => ({
	getLanguage: () => "zh-CN",
	moment: (value: any) => ({format: () => String(value)}),
	Platform: {isDesktopApp: true},
}), {virtual: true});

import {spawnSync} from "child_process";
import {existsSync, mkdtempSync, rmSync} from "fs";
import {tmpdir} from "os";
import {join} from "path";
import {CheerioAPI, load} from "cheerio";
import DoubanBookLoadHandler from "../src/org/wanxp/douban/data/handler/DoubanBookLoadHandler";
import DoubanMovieLoadHandler from "../src/org/wanxp/douban/data/handler/DoubanMovieLoadHandler";
import DoubanMusicLoadHandler from "../src/org/wanxp/douban/data/handler/DoubanMusicLoadHandler";
import DoubanGameLoadHandler from "../src/org/wanxp/douban/data/handler/DoubanGameLoadHandler";
import DoubanTheaterLoadHandler from "../src/org/wanxp/douban/data/handler/DoubanTheaterLoadHandler";
import {PersonNameMode, SupportType} from "../src/org/wanxp/constant/Constsant";

const chromePath = process.env.CHROME_PATH || "/usr/bin/google-chrome-stable";
const liveTest = process.env.DOUBAN_CHROME_VALIDATE === "1" && existsSync(chromePath) ? it : it.skip;
const plugin = {settingsManager: {getSelector: (): string[] => []}} as any;
const context = {
	settings: {personNameMode: PersonNameMode.CH_EN_NAME},
} as any;

jest.setTimeout(180_000);

function fetchWithChrome(url: string): CheerioAPI {
	const profile = mkdtempSync(join(tmpdir(), "obsidian-douban-chrome-"));
	try {
		const result = spawnSync(chromePath, [
			"--headless=new",
			"--disable-gpu",
			"--no-sandbox",
			"--disable-dev-shm-usage",
			"--lang=zh-CN",
			"--virtual-time-budget=15000",
			`--user-data-dir=${profile}`,
			"--dump-dom",
			url,
		], {encoding: "utf8", timeout: 50_000, maxBuffer: 20 * 1024 * 1024});
		if (result.status !== 0 || !result.stdout) {
			throw new Error(`Chrome failed for ${url}: ${result.stderr || result.status}`);
		}
		if (/sha512\(string\)|检测到有异常请求|sec\.douban\.com/.test(result.stdout)) {
			throw new Error(`Douban challenge did not finish for ${url}`);
		}
		return load(result.stdout);
	} finally {
		rmSync(profile, {recursive: true, force: true});
	}
}

function expectNormalizedDescription(desc: string): void {
	expect(desc).toBe(desc.trim());
	expect(desc).not.toMatch(/\n[\t ]+/);
}

describe("live Douban pages fetched by an isolated Chrome profile", () => {
	liveTest.each([
		"https://book.douban.com/subject/2567698/",
		"https://book.douban.com/subject/3066477/",
		"https://book.douban.com/subject/5363767/",
	])("parses book variants: %s", url => {
		const subject = new DoubanBookLoadHandler(plugin).parseSubjectFromHtml(fetchWithChrome(url), context);
		expect(subject.id).toMatch(/^\d+$/);
		expect(subject.title).toBeTruthy();
		expect(subject.publisher).toBeTruthy();
		expect(subject.popularComments.length).toBeLessThanOrEqual(5);
		expectNormalizedDescription(subject.desc);
	});

	liveTest.each([
		["https://movie.douban.com/subject/1292052/", SupportType.movie],
		["https://movie.douban.com/subject/3541415/", SupportType.movie],
		["https://movie.douban.com/subject/35700390/", SupportType.teleplay],
	])("parses movie and TV variants: %s", (url, type) => {
		const subject = new DoubanMovieLoadHandler(plugin).parseSubjectFromHtml(fetchWithChrome(url), context);
		expect(subject.id).toMatch(/^\d+$/);
		expect(subject.title).toBeTruthy();
		expect(subject.type).toBe(type);
		expectNormalizedDescription(subject.desc);
	});

	liveTest.each([
		"https://music.douban.com/subject/2215142/",
		"https://music.douban.com/subject/2141425/",
	])("parses music variants: %s", url => {
		const subject = new DoubanMusicLoadHandler(plugin).parseSubjectFromHtml(fetchWithChrome(url), context);
		expect(subject.id).toMatch(/^\d+$/);
		expect(subject.title).toBeTruthy();
		expectNormalizedDescription(subject.desc);
	});

	liveTest.each([
		"https://www.douban.com/game/25708879/",
		"https://www.douban.com/game/30368855/",
	])("parses game variants: %s", url => {
		const subject = new DoubanGameLoadHandler(plugin).parseSubjectFromHtml(fetchWithChrome(url), context);
		expect(subject.id).toMatch(/^\d+$/);
		expect(subject.title).toBeTruthy();
		expectNormalizedDescription(subject.desc);
	});

	liveTest.each([
		"https://www.douban.com/location/drama/11620591/",
		"https://www.douban.com/location/drama/1828273/",
	])("parses theater variants: %s", url => {
		const subject = new DoubanTheaterLoadHandler(plugin).parseSubjectFromHtml(fetchWithChrome(url), context);
		expect(subject.id).toMatch(/^\d+$/);
		expect(subject.title).toBeTruthy();
		expect(subject.type).toBe(SupportType.theater);
		expectNormalizedDescription(subject.desc);
	});
});
