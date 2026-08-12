import {CheerioAPI} from 'cheerio';
import DoubanAbstractLoadHandler from "./DoubanAbstractLoadHandler";
import DoubanPlugin from "../../../main";
import SchemaOrg from "src/org/wanxp/utils/SchemaOrg";
import DoubanSubject from '../model/DoubanSubject';
import HandleContext from "../model/HandleContext";
import {DataValueType, PropertyName, SupportType} from "../../../constant/Constsant";
import {UserStateSubject} from "../model/UserStateSubject";
import {moment} from "obsidian";
import {TITLE_ALIASES_SPECIAL_CHAR_REG_G} from "../../../utils/YamlUtil";
import DoubanTheaterSubject from "../model/DoubanTheaterSubject";
import {DataField} from "../../../utils/model/DataField";
import DoubanPageParser from "../../../utils/DoubanPageParser";
import StringUtil from "../../../utils/StringUtil";

export default class DoubanTheaterLoadHandler extends DoubanAbstractLoadHandler<DoubanTheaterSubject> {
	constructor(doubanPlugin: DoubanPlugin) {
		super(doubanPlugin);
	}

	getSupportType(): SupportType {
		return SupportType.theater;
	}

	getHighQuantityImageUrl(fileName: string): string {
		return `https://img9.doubanio.com/pview/drama_subject_poster/large/public/${fileName}`;
	}

	getSubjectUrl(id:string):string{
		return `https://www.douban.com/location/drama/${id}/`;
	}

	parseVariable(beforeContent: string, variableMap:Map<string, DataField>, extract: DoubanTheaterSubject, context: HandleContext): void {
		variableMap.set("director", new DataField(
			"director",
			DataValueType.array,
			extract.director,
			(extract.director || []).map(SchemaOrg.getPersonName).filter(c => c)
		));

		variableMap.set("actor", new DataField(
			"actor",
			DataValueType.array,
			extract.actor,
			(extract.actor || []).map(SchemaOrg.getPersonName).filter(c => c)
		));

		variableMap.set("author", new DataField(
			"author",
			DataValueType.array,
			extract.author,
			(extract.author || []).map(SchemaOrg.getPersonName).map(name => super.getPersonName(name, context)).filter(c => c)
		));

		variableMap.set("aliases", new DataField(
			"aliases",
			DataValueType.array,
			extract.aliases,
			(extract.aliases || []).map(a => a
				.trim()
				.replace(TITLE_ALIASES_SPECIAL_CHAR_REG_G, '_')
				//replace multiple _ to single _
				.replace(/_+/g, '_')
				.replace(/^_/, '')
				.replace(/_$/, '')

			)
		));
	}

	support(extract: DoubanSubject): boolean {
		return !!extract && (
			extract.url?.indexOf('/location/drama/') >= 0
			|| extract.type === SupportType.theater
			|| /舞台剧|音乐剧|话剧|舞剧|歌剧|戏曲|脱口秀|Theater/i.test(extract.type || '')
		);
	}

	analysisUser(html: CheerioAPI, context: HandleContext): { data: CheerioAPI, userState: UserStateSubject } {
		const rate = html('input#n_rating').val();
		const tags = DoubanPageParser.parseUserTags(html);
		const stateWord = html('#interest_sect_level .mr10').first().text().trim()
			|| html('#interest_sect_level > h2').text().trim();
		const collectionDateStr = html('div#interest_sect_level > div.a_stars > span.mr10 > span.collection_date').text().trim();
		const userState1 = DoubanAbstractLoadHandler.getUserState(stateWord);
		const component = DoubanPageParser.parseUserComment(html);
		const userState: UserStateSubject = {
			tags: tags,
			rate: rate ? Number(rate) : null,
			state: userState1,
			collectionDate: collectionDateStr ? moment(collectionDateStr, 'YYYY-MM-DD').toDate() : null,
			comment: component
		}
		return {data: html, userState: userState};
	}

	parseSubjectFromHtml(html: CheerioAPI, context: HandleContext): DoubanTheaterSubject {
		const pageId = html('[data-object_id]').first().attr('data-object_id')
			|| html('[share-id]').first().attr('share-id')
			|| html('script').get()
				.map(element => html(element).text().match(/_subject_\s*=\s*\{[^}]*\bid\s*:\s*["'](\d+)["']/)?.[1])
				.find(Boolean)
			|| '';
		const url = html("link[rel='canonical']").attr('href')
			|| html("meta[property='og:url']").attr('content')
			|| html("[data-url*='/location/drama/']").first().attr('data-url')
			|| '';
		const values = new Map<string, string[]>();
		html('.drama-info .meta dl dt').each((_index, labelElement) => {
			const label = DoubanPageParser.normalizeText(html(labelElement).text()).replace(/[：:]$/, '');
			const valueElement = html(labelElement).next('dd');
			const linkedValues = valueElement.find("[itemprop='name'], a")
				.get()
				.map(element => DoubanPageParser.normalizeText(html(element).text()))
				.filter(Boolean);
			const rawValue = DoubanPageParser.normalizeText(valueElement.text());
			values.set(label, linkedValues.length > 0 ? Array.from(new Set(linkedValues)) : rawValue.split(/\s*\/\s*/).filter(Boolean));
		});

		const title = DoubanPageParser.normalizeText(
			html(".drama-info [itemprop='name']").first().text() || html('.drama-info h1').text(),
		);
		const image = html(".drama-info [itemprop='image']").attr('src') || '';
		const dateText = (values.get('演出日期') || [])[0] || '';
		const dateMatch = dateText.match(/\d{4}-\d{1,2}-\d{1,2}/);
		return {
			id: StringUtil.analyzeIdByUrl(url) || pageId || StringUtil.analyzeIdByUrl(context.listItem?.url || ''),
			title,
			type: this.getSupportType(),
			score: Number(html(".drama-info [itemprop='ratingValue']").first().text()) || null,
			image,
			imageUrl: image,
			url: url || (context.listItem?.url || ''),
			desc: DoubanPageParser.extractText(html, ['.article .mod .pure-text', '.pure-text']),
			publisher: (values.get('演出团体') || []).join(' / '),
			datePublished: dateMatch ? new Date(dateMatch[0]) : undefined,
			genre: values.get('类型') || [],
			director: values.get('导演') || [],
			author: values.get('编剧') || [],
			actor: values.get('主演') || [],
			aggregateRating: undefined,
			originalTitle: (values.get('原名') || [])[0] || '',
			aliases: values.get('又名') || [],
			language: values.get('语言') || [],
		};
	}
}
