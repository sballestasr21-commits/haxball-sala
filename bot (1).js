// =====================================================================
//  Lanzador 24/7 de la sala de Haxball (Puppeteer + Chromium)
//  - Abre https://www.haxball.com/headless y ejecuta sala.js
//  - Servidor web en $PORT (para que el hosting lo mantenga vivo y para renovar el token)
//  - Si la sala se cae, intenta reabrirla (necesita un token NUEVO: ver /token)
//
//  Variables de entorno:
//    HAX_TOKEN   token de https://www.haxball.com/headlesstoken (si no, usa el que está en sala.js)
//    ADMIN_KEY   clave secreta para renovar el token desde el navegador (obligatoria para /token)
//    PORT        puerto web (Hugging Face usa 7860)
// =====================================================================
const fs = require("fs");
const http = require("http");
const path = require("path");
const puppeteer = require("puppeteer-core");

const PORT = parseInt(process.env.PORT || "7860", 10);
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const CHROME = process.env.CHROME_PATH || "/usr/bin/chromium";
let TOKEN = (process.env.HAX_TOKEN || "").trim();

let browser = null;
let roomLink = "";
let status = "iniciando";
let lastLog = [];
let restarting = false;
let retryTimer = null;

function log(m) {
	const line = new Date().toISOString() + " " + m;
	console.log(line);
	lastLog.push(line);
	if (lastLog.length > 60) lastLog.shift();
}

function loadScript() {
	let code = fs.readFileSync(path.join(__dirname, "sala.js"), "utf8");
	const clean = s => String(s).replace(/["\\\n\r]/g, "");
	if (TOKEN) code = code.replace(/(\btoken:\s*)"[^"]*"/, '$1"' + clean(TOKEN) + '"');
	if (process.env.CLOUD_DB) code = code.replace(/(\bcloudDB:\s*)"[^"]*"/, '$1"' + clean(process.env.CLOUD_DB.trim()) + '"');
	if (process.env.OWNER_CODE) code = code.replace(/(\bownerCode:\s*)"[^"]*"/, '$1"' + clean(process.env.OWNER_CODE.trim()) + '"');
	return code;
}

async function stopBrowser() {
	try { if (browser) await browser.close(); } catch (e) {}
	browser = null;
}

async function launch() {
	if (restarting) return;
	restarting = true;
	if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
	roomLink = "";
	status = "abriendo navegador";
	await stopBrowser();
	try {
		browser = await puppeteer.launch({
			executablePath: CHROME,
			headless: "new",
			args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--mute-audio", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"]
		});
		browser.on("disconnected", () => { if (!restarting) { log("⚠️ El navegador se cerró"); scheduleRetry(30000); } });
		const page = await browser.newPage();
		page.on("console", msg => {
			const t = msg.text();
			if (/^(Announce:|JOIN:|.* salió de la sala|☁️|💾|✅|⚠️|BACKUP_CUENTAS)/.test(t) || /haxball\.com\/play/.test(t)) log("[sala] " + t.slice(0, 400));
			const m = t.match(/https:\/\/www\.haxball\.com\/play\?c=[\w-]+/);
			if (m) { roomLink = m[0]; status = "ONLINE"; }
		});
		page.on("pageerror", e => log("[pageerror] " + e.message));
		status = "cargando haxball.com/headless";
		await page.goto("https://www.haxball.com/headless", { waitUntil: "networkidle2", timeout: 90000 });
		await page.waitForFunction('typeof HBInit === "function"', { timeout: 60000 });
		status = "creando sala";
		await page.evaluate(loadScript());
		log("▶️ Script ejecutado, esperando el enlace de la sala...");
		setTimeout(() => {
			if (!roomLink) {
				status = "SIN ENLACE (¿token vencido o usado?)";
				log("❌ No apareció el enlace de la sala. Pide un token nuevo en https://www.haxball.com/headlesstoken y envíalo a /token");
			}
		}, 45000);
	} catch (e) {
		status = "error: " + e.message;
		log("❌ Error al lanzar: " + e.message);
		scheduleRetry(60000);
	}
	restarting = false;
}

function scheduleRetry(ms) {
	if (retryTimer) return;
	retryTimer = setTimeout(() => { retryTimer = null; launch(); }, ms);
}

// Servidor web: / (estado) y /token?key=ADMIN_KEY&t=NUEVO_TOKEN (renueva el token y reinicia la sala)
http.createServer((req, res) => {
	const u = new URL(req.url, "http://x");
	if (u.pathname === "/token") {
		if (!ADMIN_KEY || u.searchParams.get("key") !== ADMIN_KEY) { res.writeHead(403); res.end("clave incorrecta"); return; }
		const t = (u.searchParams.get("t") || "").trim();
		if (!/^thr1\.[\w.\-]+$/.test(t)) { res.writeHead(400); res.end("token invalido"); return; }
		TOKEN = t;
		log("🔑 Token nuevo recibido, reiniciando sala");
		launch();
		res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
		res.end("Token recibido. Reiniciando sala... revisa / en 30 segundos.");
		return;
	}
	res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
	res.end("<meta name=viewport content='width=device-width'><body style='font-family:sans-serif;background:#111;color:#eee;padding:16px'>" +
		"<h2>Real Soccer Revolution · bot</h2><p>Estado: <b>" + status + "</b></p>" +
		(roomLink ? "<p>Sala: <a style='color:#8cf' href='" + roomLink + "'>" + roomLink + "</a></p>" : "") +
		"<pre style='white-space:pre-wrap;font-size:12px'>" + lastLog.slice(-25).join("\n").replace(/</g, "&lt;") + "</pre>");
}).listen(PORT, () => log("🌐 Web en puerto " + PORT));

// si el navegador no responde, se reinicia solo cada cierto tiempo de inactividad total
setInterval(async () => {
	if (status !== "ONLINE" || !browser) return;
	try { const pages = await browser.pages(); await pages[pages.length - 1].evaluate("1+1"); }
	catch (e) { log("⚠️ La página no responde"); status = "caído"; scheduleRetry(5000); }
}, 60000);

process.on("unhandledRejection", e => log("unhandledRejection: " + (e && e.message)));
launch();
