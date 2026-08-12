import {SupportType} from "../constant/Constsant";

export interface ParsedDoubanUrl {
	id: string;
	type: SupportType;
	url: string;
}

export default class DoubanUrlUtil {
	static parse(value: string): ParsedDoubanUrl | null {
		let url: URL;
		try {
			url = new URL((value || '').trim());
		} catch (_error) {
			return null;
		}
		if (url.protocol !== 'https:' && url.protocol !== 'http:') {
			return null;
		}
		const host = url.hostname.toLowerCase();
		const id = url.pathname.match(/\/(?:subject|game|drama)\/(\d{5,10})(?:\/|$)/)?.[1];
		if (!id || !host.endsWith('douban.com')) {
			return null;
		}
		let type: SupportType;
		if (host === 'book.douban.com') {
			type = SupportType.book;
		} else if (host === 'music.douban.com') {
			type = SupportType.music;
		} else if (host === 'movie.douban.com') {
			type = SupportType.movie;
		} else if (/\/location\/drama\//.test(url.pathname)) {
			type = SupportType.theater;
		} else if (/\/game\//.test(url.pathname)) {
			type = SupportType.game;
		} else {
			return null;
		}
		return {id, type, url: url.toString()};
	}
}
