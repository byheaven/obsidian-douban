import {createServer, Server} from "http";
import {AddressInfo} from "net";
import DesktopHttpUtil from "../src/org/wanxp/utils/desktop/DesktopHttpUtil";

jest.mock("obsidian", () => ({Platform: {isDesktopApp: true}}), {virtual: true});

describe("DesktopHttpUtil", () => {
	let server: Server;
	let port: number;

	beforeAll(done => {
		let retryAttempts = 0;
		server = createServer((request, response) => {
			if (request.url === "/hang") {
				return;
			}
			if (request.url === "/retry") {
				retryAttempts++;
				if (retryAttempts === 1) {
					request.socket.destroy();
					return;
				}
				response.writeHead(200).end("retried");
				return;
			}
			if (request.url === "/verify") {
				const chunks: Buffer[] = [];
				request.on("data", chunk => chunks.push(chunk));
				request.on("end", () => {
					if (Buffer.concat(chunks).toString() !== "proof=accepted") {
						response.writeHead(400).end("missing proof");
						return;
					}
					response.writeHead(302, {
						Location: `http://localhost:${port}/subject`,
						"Set-Cookie": ["dbsawcv1=verified; Path=/; HttpOnly", "bid=new-bid; Path=/"],
					}).end();
				});
				return;
			}

			const cookie = request.headers.cookie || "";
			const verified = cookie.includes("session=logged-in")
				&& cookie.includes("dbsawcv1=verified")
				&& cookie.includes("bid=new-bid");
			response.writeHead(verified ? 200 : 401).end(verified ? "detail page" : cookie);
		});
		server.listen(0, "127.0.0.1", () => {
			port = (server.address() as AddressInfo).port;
			done();
		});
	});

	afterAll(done => {
		server.close(done);
	});

	it("submits a form body and carries existing and verification cookies across redirects", async () => {
		const response = await DesktopHttpUtil.request(
			`http://127.0.0.1:${port}/verify`,
			{Cookie: "session=logged-in; bid=old-bid", Host: "wrong.example", "Content-Type": "application/x-www-form-urlencoded"},
			undefined,
			{method: "POST", body: "proof=accepted"},
		);

		expect(response.status).toBe(200);
		expect(response.textString).toBe("detail page");
	});

	it("aborts a request that never completes", async () => {
		await expect(DesktopHttpUtil.request(
			`http://127.0.0.1:${port}/hang`,
			{},
			undefined,
			{timeoutMs: 30, retryCount: 0},
		)).rejects.toThrow("timed out");
	});

	it("retries a failed GET a finite number of times", async () => {
		const response = await DesktopHttpUtil.request(
			`http://127.0.0.1:${port}/retry`,
			{},
			undefined,
			{timeoutMs: 1000, retryCount: 1},
		);
		expect(response.status).toBe(200);
		expect(response.textString).toBe("retried");
	});
});
