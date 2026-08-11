import {createHash} from "crypto";
import {DoubanChallengeUtil} from "../src/org/wanxp/utils/DoubanChallengeUtil";

describe("DoubanChallengeUtil", () => {
	it("parses and solves the sec.douban.com proof-of-work form", async () => {
		const html = `
			<form name="sec" id="sec" method="POST" action="/c">
				<input type="hidden" name="tok" value="token-value" />
				<input type="hidden" name="cha" value="a" />
				<input type="hidden" name="sol" value="" />
				<input type="hidden" name="red" value="https://movie.douban.com/subject/1295644/" />
			</form>
			<script>async function process(data, difficulty = 4) {}</script>
		`;

		const challenge = DoubanChallengeUtil.parse(html);
		expect(challenge).not.toBeNull();
		const solution = await DoubanChallengeUtil.solve(challenge!);
		const hash = createHash("sha512").update(`a${solution}`).digest("hex");
		expect(hash.startsWith("0000")).toBe(true);
		expect(DoubanChallengeUtil.buildRequestBody(challenge!, solution)).toContain(`sol=${solution}`);
	});

	it("ignores ordinary detail pages", () => {
		expect(DoubanChallengeUtil.parse("<html><title>Movie</title></html>")).toBeNull();
	});
});
