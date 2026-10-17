// =====================================================================
//  🔆 REAL SOCCER REVOLUTION (RSR) · Host público · Gana Sigue + Picks
//  · 1v1 / 2v2 → mapa Classic · 3v3 / 4v4 → mapa Real Soccer Revolution
//  · Picks uno por uno (rojo, azul, rojo, azul...) · 1:15 por turno
//  · El ganador se queda de ROJO · Empate: salen los dos equipos
//  · Único admin: el dueño (se reconoce por su "auth", sin comandos ni claves)
//  · ☁️ Cuentas guardadas en la NUBE (Firebase): ya no se pierden al cambiar de navegador/PC/VPS
//
//  Cómo usarlo:
//   1) Abre https://www.haxball.com/headless
//   2) Consigue un token en https://www.haxball.com/headlesstoken y pégalo en CONFIG.token
//   3) Pon la URL de tu base de datos en CONFIG.cloudDB (mira la guía)
//   4) Pega este archivo completo en la consola (F12) y presiona Enter.
// =====================================================================

/*=============================== CONFIG ===============================*/
const CONFIG = {
	roomName: "🔵⚪ Real Soccer Revolution | 4v4 Gana Sigue ⚪🔵",
	roomPassword: null,            // "clave" o null
	maxPlayers: 24,
	roomPublic: true,
	geo: { code: "CO", lat: 4.7110, lon: -74.0721 },
	token: "thr1.AAAAAGrS4Ieb7uQTpI13Wg.wv3B-Gi74dk",   // https://www.haxball.com/headlesstoken (es de un solo uso: si da error, pide uno nuevo)

	// ☁️ BASE DE DATOS EN LA NUBE (Firebase Realtime Database). Aquí se guardan las cuentas para siempre.
	// Formato: "https://TUPROYECTO-default-rtdb.firebaseio.com/UNA_RUTA_LARGA_Y_SECRETA"  (sin .json al final)
	// Si lo dejas vacío "", las cuentas solo se guardan en el navegador (y se pueden perder).
	cloudDB: "https://TUPROYECTO-default-rtdb.firebaseio.com/rsr_x7k29qpw",

	stadiumName: "Real Soccer Revolution",
	mapBGColor: "86A578",          // color del césped (hex sin #)

	teamSize: 4,                   // máximo por equipo (4v4)
	scoreLimit: 3,
	gameMinutes: 5,                // el tiempo lo maneja el bot (tiempo extra real)
	maxStreak: 0,                  // 0 = el ganador sigue sin límite; N = descansa tras N victorias seguidas

	picks: { enabled: true, turnSeconds: 75, minPlayers: 4, kickIdleCaptain: true }, // 75 s = 1:15 por turno · si el capitán no elige, se le expulsa y elige el siguiente
	extraTime: { maxSeconds: 60, countThrowIns: true, countGoals: true },       // tiempo añadido = saques de arco + córners + bandas + festejos de gol (máx. 60 s)
	lastPlayMaxSeconds: { rsr: 30, classic: 8 },                                  // tope de seguridad de la "última jugada"
	idle: { warnSeconds: 25, moveSeconds: 40 },
	chat: { minIntervalMs: 700, repeatWindowMs: 5000, muteStrikes: 3, muteSeconds: 30 },
	elo: { start: 1000, k: 30 },   // Elo inicial y sensibilidad (K). El Elo PUEDE ser negativo
	accounts: { autoLoginByAuth: true }, // true = si entras con el mismo navegador de tu cuenta, inicias sesión solo
	importAccounts: {},            // respaldo de cuentas: pega aquí lo que te dé !backup

	ownerAuths: ["mDjkyv5uiKEaC9iRHeoCI_Sy-DNGS4i7qcOtTDmdtvQ"],  // 👑 DUEÑO (único admin): tu "auth" (ID público). Entras y recibes admin automáticamente
	adminAuths: [],                // 🛡 ADMINS normales (no son dueño): pega aquí sus auth ["auth1", "auth2"]. También puedes nombrarlos desde la sala con: !admin nombre
	adminConns: [],                // 🛡 ADMINS normales por IP: pega aquí el conn de cada uno ["conn1", "conn2"] (míralo con !ip nombre). ⚠ Quien comparta esa red también sería admin
	staffCanKick: true,            // true = los admins normales pueden kickear (los BANS solo los puede hacer el dueño)
	ownerConns: ["3137392E31352E38362E3237"], // 🌐 SuperAdmin por IP: tu "conn". ⚠ Si tu IP cambia, deja de funcionar, y quien comparta tu red también sería SuperAdmin
	ownerFirstJoinSeconds: 0,      // DESACTIVADO: el primer jugador que entra ya NO recibe admin
	ownerCode: "",  // 🔑 CLAVE DE DUEÑO. En la sala escribe !owner TUCLAVE (nadie ve el mensaje). ⚠ CÁMBIALA: ya la compartiste. Vacía = desactivada
	punishUnauthorizedBans: true,  // si un admin sin código banea/kickea, se revierte y se le expulsa
	blacklistConn: [],             // lista negra por "conn" (nunca se muestra en el chat)

	discord: { callAdmin: "", log: "", replays: "", adminRoleId: "", invite: "" } // webhooks: vacíos = desactivado
};

// Árbitro (los tiempos están en ticks: 60 = 1 segundo)
const REF = {
	throwTimeOut: 420,       // 7 s para sacar de banda
	gkTimeOut: 600,          // 10 s saque de arco
	ckTimeOut: 600,          // 10 s córner
	throwinDistance: 270,    // distancia máxima que puede correr el balón en el saque de banda
	ckBarrierRadius: 320,    // radio de la zona prohibida al rival en córners (el original usaba 420)
	playerInvMass: 0.3,      // masa de los jugadores (el original lo aplicaba solo tras el 1er saque)
	announceCorners: true    // aviso discreto en el chat cuando hay córner
};

const BALL_RED = 0xFF3F34, BALL_BLUE = 0x0FBCF9, BALL_WHITE = 0xFFFFFF;
const COLOR = { info: 0xFFFD82, whisper: 0x66C7FF, red: 0xED6A5A, blue: 0x5995ED, spec: 0xDEE7FA, ok: 0x7CFC9A, warn: 0xFFB347, brand: 0x82B3FB, pm: 0xFF20FF };

/*============================== ESTADIO ===============================*/
// Mapa "Real Soccer Revolution" (derivado del Estadio FARS, mismos índices de discos).
const RSR_STADIUM = {"name":"Real Soccer Revolution","width":1300,"height":660,"spawnDistance":560,"bg":{"type":"grass","width":1150,"height":600,"kickOffRadius":180,"cornerRadius":0,"color":"86A578"},"playerPhysics":{"bCoef":0.3,"invMass":0.5,"damping":0.96,"acceleration":0.12,"kickingAcceleration":0.07,"kickingDamping":0.96,"kickStrength":5.65},"ballPhysics":{"radius":9,"bCoef":0.5,"invMass":1.05,"damping":0.99,"color":"FFFFFF","cMask":["all"],"cGroup":["ball"]},"vertexes":[{"x":0,"y":660,"trait":"kickOffBarrier"},{"x":0,"y":180,"trait":"kickOffBarrier"},{"x":0,"y":-180,"trait":"kickOffBarrier"},{"x":0,"y":-660,"trait":"kickOffBarrier"},{"x":1150,"y":320,"trait":"line"},{"x":840,"y":320,"trait":"line"},{"x":1150,"y":-320,"trait":"line"},{"x":840,"y":-320,"trait":"line"},{"x":1150,"y":180,"trait":"line"},{"x":1030,"y":180,"trait":"line"},{"x":1150,"y":-180,"trait":"line"},{"x":1030,"y":-180,"trait":"line"},{"x":840,"y":-130,"trait":"line","curve":-130},{"x":840,"y":130,"trait":"line","curve":-130},{"x":-1150,"y":-320,"trait":"line"},{"x":-840,"y":-320,"trait":"line"},{"x":-1150,"y":320,"trait":"line"},{"x":-840,"y":320,"trait":"line"},{"x":-1150,"y":-175,"trait":"line"},{"x":-1030,"y":-175,"trait":"line"},{"x":-1150,"y":175,"trait":"line"},{"x":-1030,"y":175,"trait":"line"},{"x":-840,"y":130,"trait":"line","curve":-130},{"x":-840,"y":-130,"trait":"line","curve":-130},{"x":935,"y":3,"trait":"line"},{"x":935,"y":-3,"trait":"line"},{"x":-935,"y":3,"trait":"line"},{"x":-935,"y":-3,"trait":"line"},{"x":-1150,"y":570,"bCoef":-2.65,"cMask":["ball"],"cGroup":["c0"],"trait":"line"},{"x":-1120,"y":600,"bCoef":-2.65,"cMask":["ball"],"cGroup":["c0"],"trait":"line"},{"x":-1120,"y":-600,"bCoef":-2.65,"cMask":["ball"],"cGroup":["c0"],"trait":"line"},{"x":-1150,"y":-570,"bCoef":-2.65,"cMask":["ball"],"cGroup":["c0"],"trait":"line"},{"x":1120,"y":600,"bCoef":-2.65,"cMask":["ball"],"cGroup":["c0"],"trait":"line"},{"x":1150,"y":570,"bCoef":-2.65,"cMask":["ball"],"cGroup":["c0"],"trait":"line"},{"x":1150,"y":-570,"bCoef":-2.65,"cMask":["ball"],"cGroup":["c0"],"trait":"line"},{"x":1120,"y":-600,"bCoef":-2.65,"cMask":["ball"],"cGroup":["c0"],"trait":"line"},{"x":0,"y":180,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["blueKO"],"trait":"kickOffBarrier","curve":-180},{"x":0,"y":-180,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO"],"trait":"kickOffBarrier","curve":180},{"x":0,"y":180,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO"],"trait":"kickOffBarrier","curve":180},{"x":-1030,"y":-40,"bCoef":-5.7,"cMask":["ball"],"cGroup":["c0"],"trait":"line","curve":70,"color":"576C46","vis":false},{"x":-1030,"y":40,"bCoef":-5.7,"cMask":["ball"],"cGroup":["c0"],"trait":"line","curve":70,"color":"576C46","vis":false},{"x":1030,"y":-40,"bCoef":-5.7,"cMask":["ball"],"cGroup":["c0"],"trait":"line","curve":-70,"color":"576C46","vis":false},{"x":1030,"y":40,"bCoef":-5.7,"cMask":["ball"],"cGroup":["c0"],"trait":"line","curve":-70,"color":"576C46","vis":false},{"x":1030,"y":-40,"trait":"line","color":"576C46"},{"x":1030,"y":40,"trait":"line","color":"576C46"},{"x":-1030,"y":-40,"trait":"line","color":"576C46"},{"x":-1030,"y":40,"trait":"line","color":"576C46"},{"x":0,"y":3,"trait":"line"},{"x":0,"y":-3,"trait":"line"},{"x":-1157,"y":605,"bCoef":0,"cMask":["ball"],"trait":"ballArea"},{"x":-1157,"y":655,"bCoef":0,"cMask":["ball"],"trait":"ballArea"},{"x":-1157,"y":-655,"bCoef":0,"cMask":["ball"],"trait":"ballArea"},{"x":-1157,"y":-605,"bCoef":0,"cMask":["ball"],"trait":"ballArea"},{"x":1157,"y":605,"bCoef":0,"cMask":["ball"],"trait":"ballArea"},{"x":1157,"y":655,"bCoef":0,"cMask":["ball"],"trait":"ballArea"},{"x":1157,"y":-655,"bCoef":0,"cMask":["ball"],"trait":"ballArea"},{"x":1157,"y":-605,"bCoef":0,"cMask":["ball"],"trait":"ballArea"},{"x":-1300,"y":-485,"bCoef":0,"cMask":["c1"],"cGroup":["red","blue"],"color":"ec644b","vis":false},{"x":1300,"y":-485,"bCoef":0,"cMask":["c1"],"cGroup":["red","blue"],"color":"ec644b","vis":false},{"x":-1300,"y":485,"bCoef":0,"cMask":["c1"],"cGroup":["red","blue"],"color":"ec644b","vis":false},{"x":1300,"y":485,"bCoef":0,"cMask":["c1"],"cGroup":["red","blue"],"color":"ec644b","vis":false},{"x":-1295,"y":-320,"cMask":["c0"],"cGroup":["red","blue"]},{"x":-840,"y":-320,"cMask":["c0"],"cGroup":["red","blue"]},{"x":-840,"y":320,"cMask":["c0"],"cGroup":["red","blue"]},{"x":-1295,"y":320,"cMask":["c0"],"cGroup":["red","blue"]},{"x":1295,"y":-320,"cMask":["c0"],"cGroup":["red","blue"]},{"x":840,"y":-320,"cMask":["c0"],"cGroup":["red","blue"]},{"x":840,"y":320,"cMask":["c0"],"cGroup":["red","blue"]},{"x":1295,"y":320,"cMask":["c0"],"cGroup":["red","blue"]},{"x":-1150,"y":-124,"bCoef":0,"cMask":["ball","red","blue"]},{"x":-1210,"y":-124,"bCoef":0,"cMask":["ball"],"bias":0,"curve":5},{"x":-1150,"y":124,"bCoef":0,"cMask":["ball","red","blue"]},{"x":-1210,"y":124,"bCoef":0,"cMask":["ball"],"bias":0,"curve":5},{"x":-1250,"y":-158,"bCoef":0,"cMask":["ball"]},{"x":-1250,"y":158,"bCoef":0,"cMask":["ball"]},{"x":1150,"y":124,"bCoef":0,"cMask":["ball","red","blue"]},{"x":1210,"y":124,"bCoef":0,"cMask":["ball"],"curve":-5},{"x":1150,"y":-124,"bCoef":0,"cMask":["ball","red","blue"]},{"x":1210,"y":-124,"bCoef":0,"cMask":["ball"],"curve":-5},{"x":1250,"y":-158,"bCoef":0,"cMask":["ball"]},{"x":1250,"y":158,"bCoef":0,"cMask":["ball"]}],"segments":[{"v0":0,"v1":1,"trait":"kickOffBarrier"},{"v0":2,"v1":3,"trait":"kickOffBarrier"},{"v0":4,"v1":5,"trait":"line","y":320},{"v0":5,"v1":7,"trait":"line","x":840},{"v0":6,"v1":7,"trait":"line","y":-320},{"v0":8,"v1":9,"trait":"line","y":180},{"v0":9,"v1":11,"trait":"line","x":1030},{"v0":10,"v1":11,"trait":"line","y":-180},{"v0":12,"v1":13,"curve":-130,"trait":"line","x":840},{"v0":14,"v1":15,"trait":"line","y":-320},{"v0":15,"v1":17,"trait":"line","x":-840},{"v0":16,"v1":17,"trait":"line","y":320},{"v0":18,"v1":19,"trait":"line","y":-175},{"v0":19,"v1":21,"trait":"line","x":-1030},{"v0":20,"v1":21,"trait":"line","y":175},{"v0":22,"v1":23,"curve":-130,"trait":"line","x":-840},{"v0":24,"v1":25,"curve":-180,"trait":"line","x":935},{"v0":26,"v1":27,"curve":-180,"trait":"line","x":-935},{"v0":24,"v1":25,"curve":180,"trait":"line","x":935},{"v0":26,"v1":27,"curve":180,"trait":"line","x":-935},{"v0":24,"v1":25,"curve":90,"trait":"line","x":935},{"v0":26,"v1":27,"curve":90,"trait":"line","x":-935},{"v0":24,"v1":25,"curve":-90,"trait":"line","x":935},{"v0":26,"v1":27,"curve":-90,"trait":"line","x":-935},{"v0":24,"v1":25,"trait":"line","x":935},{"v0":26,"v1":27,"trait":"line","x":-935},{"v0":28,"v1":29,"curve":90,"bCoef":-2.65,"cMask":["ball"],"cGroup":["c0"],"trait":"line"},{"v0":30,"v1":31,"curve":90,"bCoef":-2.65,"cMask":["ball"],"cGroup":["c0"],"trait":"line"},{"v0":32,"v1":33,"curve":90,"bCoef":-2.65,"cMask":["ball"],"cGroup":["c0"],"trait":"line"},{"v0":34,"v1":35,"curve":90,"bCoef":-2.65,"cMask":["ball"],"cGroup":["c0"],"trait":"line"},{"v0":37,"v1":36,"curve":-180,"vis":false,"bCoef":0.1,"cGroup":["blueKO"],"trait":"kickOffBarrier"},{"v0":39,"v1":40,"curve":70,"vis":false,"color":"576C46","bCoef":-5.7,"cMask":["ball"],"cGroup":["c0"],"trait":"line","x":-1030},{"v0":41,"v1":42,"curve":-70,"vis":false,"color":"576C46","bCoef":-5.7,"cMask":["ball"],"cGroup":["c0"],"trait":"line","x":1030},{"v0":37,"v1":38,"curve":180,"vis":false,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO"],"trait":"kickOffBarrier"},{"v0":43,"v1":44,"vis":true,"color":"576C46","trait":"line","x":1030},{"v0":45,"v1":46,"vis":true,"color":"576C46","trait":"line","x":-1030},{"v0":47,"v1":48,"curve":-180,"trait":"line","x":-935},{"v0":47,"v1":48,"curve":180,"trait":"line","x":-935},{"v0":47,"v1":48,"curve":90,"trait":"line","x":-935},{"v0":47,"v1":48,"curve":-90,"trait":"line","x":-935},{"v0":47,"v1":48,"trait":"line","x":-935},{"v0":49,"v1":50,"color":"FFFF00","bCoef":0,"cMask":["ball"],"trait":"ballArea","x":-1157},{"v0":51,"v1":52,"color":"FFFF00","bCoef":0,"cMask":["ball"],"trait":"ballArea","x":-1157},{"v0":53,"v1":54,"color":"FFFF00","bCoef":0,"cMask":["ball"],"trait":"ballArea","x":1157},{"v0":55,"v1":56,"color":"FFFF00","bCoef":0,"cMask":["ball"],"trait":"ballArea","x":1157},{"v0":57,"v1":58,"vis":false,"color":"ec644b","bCoef":0,"cMask":["c1"],"cGroup":["red","blue"],"y":-485},{"v0":59,"v1":60,"vis":false,"color":"ec644b","bCoef":0,"cMask":["c1"],"cGroup":["red","blue"],"y":485},{"v0":61,"v1":62,"vis":false,"color":"ec644b","cMask":["c0"],"cGroup":["red","blue"]},{"v0":62,"v1":63,"vis":false,"color":"ec644b","cMask":["c0"],"cGroup":["red","blue"]},{"v0":63,"v1":64,"vis":false,"color":"ec644b","cMask":["c0"],"cGroup":["red","blue"]},{"v0":65,"v1":66,"vis":false,"cMask":["c0"],"cGroup":["red","blue"]},{"v0":66,"v1":67,"vis":false,"cMask":["c0"],"cGroup":["red","blue"]},{"v0":67,"v1":68,"vis":false,"cMask":["c0"],"cGroup":["red","blue"]},{"v0":69,"v1":70,"color":"FFFFFF","bCoef":0,"cMask":["ball","red","blue"],"y":-124},{"v0":71,"v1":72,"color":"FFFFFF","bCoef":0,"cMask":["ball","red","blue"],"y":124},{"v0":72,"v1":70,"curve":5,"color":"FFFFFF","bCoef":0,"cMask":["ball","red","blue"],"bias":0},{"v0":70,"v1":73,"color":"FFFFFF","bCoef":0,"cMask":["ball"]},{"v0":72,"v1":74,"color":"FFFFFF","bCoef":0,"cMask":["ball"]},{"v0":75,"v1":76,"color":"FFFFFF","bCoef":0,"cMask":["ball","red","blue"],"y":124},{"v0":77,"v1":78,"color":"FFFFFF","bCoef":0,"cMask":["ball","red","blue"],"y":-124},{"v0":76,"v1":78,"curve":-5,"color":"FFFFFF","bCoef":0,"cMask":["ball","red","blue"]},{"v0":78,"v1":79,"color":"FFFFFF","bCoef":0,"cMask":["ball"]},{"v0":76,"v1":80,"color":"FFFFFF","bCoef":0,"cMask":["ball"]}],"goals":[{"p0":[-1162,124],"p1":[-1162,-124],"team":"red"},{"p0":[1162,124],"p1":[1162,-124],"team":"blue","radius":0,"invMass":1}],"discs":[{"radius":0,"invMass":0,"pos":[-1311,-19],"color":"ffffffff","bCoef":0,"cMask":["red"],"cGroup":["ball"]},{"radius":0,"invMass":0,"pos":[-1310,29],"color":"ffffffff","bCoef":0,"cMask":["blue"],"cGroup":["ball"]},{"radius":0,"invMass":0,"pos":[-1308,62],"color":"ffffffff","bCoef":0,"cMask":["red","blue"],"cGroup":["ball"]},{"radius":2.7,"pos":[-1150,600],"cGroup":["ball"],"trait":"cornerflag"},{"radius":2.7,"pos":[1150,-600],"cGroup":["ball"],"trait":"cornerflag"},{"radius":2.7,"pos":[1150,600],"cGroup":["ball"],"trait":"cornerflag"},{"radius":5,"invMass":0,"pos":[-1150,-124],"bCoef":0.5,"trait":"goalPost"},{"radius":5,"invMass":0,"pos":[-1150,124],"bCoef":0.5,"trait":"goalPost"},{"radius":2,"invMass":0,"pos":[-1250,-158],"color":"000000","bCoef":1,"trait":"goalPost"},{"radius":2,"invMass":0,"pos":[-1250,158],"color":"000000","bCoef":1,"trait":"goalPost"},{"radius":5,"invMass":0,"pos":[1150,-124],"bCoef":0.5,"trait":"goalPost"},{"radius":5,"invMass":0,"pos":[1150,124],"bCoef":0.5,"trait":"goalPost"},{"radius":2,"invMass":0,"pos":[1250,-158],"color":"000000","bCoef":1,"trait":"goalPost"},{"radius":2,"invMass":0,"pos":[1250,158],"color":"000000","bCoef":1,"trait":"goalPost"},{"radius":2.7,"pos":[-1150,-600],"cGroup":["ball"],"trait":"cornerflag"},{"radius":0,"pos":[-1149,-485],"cMask":["none"]},{"radius":0,"pos":[1149,-485],"cMask":["none"]},{"radius":0,"pos":[-1149,-485],"cMask":["none"]},{"radius":0,"pos":[1149,-485],"cMask":["none"]},{"radius":0,"pos":[-1149,485],"cMask":["none"]},{"radius":0,"pos":[1149,485],"cMask":["none"]},{"radius":0,"pos":[-1149,485],"cMask":["none"]},{"radius":0,"pos":[1149,485],"cMask":["none"]}],"planes":[{"normal":[0,1],"dist":-627,"bCoef":0,"cGroup":["ball"],"trait":"ballArea","_data":{"extremes":{"normal":[0,1],"dist":-627,"canvas_rect":[-1311,-660,1300,660],"a":[-1311,-627],"b":[1300,-627]}}},{"normal":[0,-1],"dist":-627,"bCoef":0,"cGroup":["ball"],"trait":"ballArea","_data":{"extremes":{"normal":[0,-1],"dist":-627,"canvas_rect":[-1311,-660,1300,660],"a":[-1311,627],"b":[1300,627]}}},{"normal":[0,1],"dist":-660,"bCoef":0,"_data":{"extremes":{"normal":[0,1],"dist":-660,"canvas_rect":[-1311,-660,1300,660],"a":[-1311,-660],"b":[1300,-660]}}},{"normal":[0,-1],"dist":-660,"bCoef":0,"_data":{"extremes":{"normal":[0,-1],"dist":-660,"canvas_rect":[-1311,-660,1300,660],"a":[-1311,660],"b":[1300,660]}}},{"normal":[1,0],"dist":-1300,"bCoef":0,"_data":{"extremes":{"normal":[1,0],"dist":-1300,"canvas_rect":[-1311,-660,1300,660],"a":[-1300,-660],"b":[-1300,660]}}},{"normal":[-1,0],"dist":-1300,"bCoef":0.1,"_data":{"extremes":{"normal":[-1,0],"dist":-1300,"canvas_rect":[-1311,-660,1300,660],"a":[1300,-660],"b":[1300,660]}}},{"normal":[1,0],"dist":-1230,"bCoef":0,"cMask":["ball"],"cGroup":["ball"],"_data":{"extremes":{"normal":[1,0],"dist":-1230,"canvas_rect":[-1311,-660,1300,660],"a":[-1230,-660],"b":[-1230,660]}}},{"normal":[-1,0],"dist":-1230,"bCoef":0,"cMask":["ball"],"cGroup":["ball"],"_data":{"extremes":{"normal":[-1,0],"dist":-1230,"canvas_rect":[-1311,-660,1300,660],"a":[1230,-660],"b":[1230,660]}}}],"traits":{"ballArea":{"vis":false,"bCoef":0,"cMask":["ball"],"cGroup":["ball"]},"goalPost":{"radius":5,"invMass":0,"bCoef":1,"cGroup":["ball"]},"rightNet":{"radius":0,"invMass":1,"bCoef":0,"cGroup":["ball","c3"]},"leftNet":{"radius":0,"invMass":1,"bCoef":0,"cGroup":["ball","c2"]},"stanchion":{"radius":3,"invMass":0,"bCoef":3,"cMask":["none"]},"cornerflag":{"radius":3,"invMass":0,"bCoef":0.2,"color":"FFFF00","cMask":["ball"]},"reargoalNetleft":{"vis":true,"bCoef":0.1,"cMask":["ball","red","blue"],"curve":10,"color":"C7E6BD"},"reargoalNetright":{"vis":true,"bCoef":0.1,"cMask":["ball","red","blue"],"curve":-10,"color":"C7E6BD"},"sidegoalNet":{"vis":true,"bCoef":1,"cMask":["ball","red","blue"],"color":"C7E6BD"},"kickOffBarrier":{"vis":false,"bCoef":0.1,"cGroup":["redKO","blueKO"],"cMask":["red","blue"]},"line":{"vis":true,"cMask":[],"color":"C7E6BD"}},"joints":[{"d0":16,"d1":17,"strength":"rigid","color":"ec7458","length":null},{"d0":18,"d1":19,"strength":"rigid","color":"48bef9","length":null},{"d0":20,"d1":21,"strength":"rigid","color":"ec7458","length":null},{"d0":22,"d1":23,"strength":"rigid","color":"48bef9","length":null}],"redSpawnPoints":[],"blueSpawnPoints":[],"canBeStored":false};

function getRSRMap() {
	const m = JSON.parse(JSON.stringify(RSR_STADIUM));
	m.name = CONFIG.stadiumName;
	m.bg.color = CONFIG.mapBGColor;
	return JSON.stringify(m);
}

/*=============================== SALA ================================*/
const room = HBInit({
	roomName: CONFIG.roomName,
	password: CONFIG.roomPassword,
	maxPlayers: CONFIG.maxPlayers,
	public: CONFIG.roomPublic,
	geo: CONFIG.geo,
	noPlayer: true,
	token: CONFIG.token
});

room.setCustomStadium(getRSRMap());
room.setScoreLimit(CONFIG.scoreLimit);
room.setTimeLimit(0);
room.setTeamsLock(true);
room.setTeamColors(1, 60, 0xFFFFFF, [0xE63946, 0xB5121B, 0xE63946]);
room.setTeamColors(2, 60, 0xFFFFFF, [0x3A86FF, 0x1D4ED8, 0x3A86FF]);

/*============================== ESTADO ===============================*/
let game = null;
let state = "waiting";        // waiting | picking | playing | ending
let queue = [];               // ids de espectadores en orden de llegada
let draft = null;             // picks en curso
let pendingResult = null;     // resultado a procesar cuando termine la partida
let incumbent = 0;            // equipo que "se quedó" (ganador)
let streak = 0;
let autoHold = false;         // true cuando un admin detiene la partida a mano
let ignoreStops = 0;
let checkTimer = null;
let emptyTimer = null;
let lastWaitNotice = "";
let lastWaitAt = 0;
let roomLink = "";
const P = {};                 // info extra por jugador
let currentMap = "rsr";       // rsr | classic (lo decide el bot según los jugadores)
const captainIds = { 1: null, 2: null };

/*============================== UTILIDADES ============================*/
function announce(msg, targetId, color, style, sound) {
	room.sendAnnouncement(msg, targetId == null ? null : targetId, color == null ? COLOR.info : color, style || "bold", sound || 0);
	console.log("Announce: " + msg);
}
function whisper(msg, targetId, color, style, sound) {
	room.sendAnnouncement(msg, targetId, color == null ? COLOR.whisper : color, style || "normal", sound || 0);
}
function info(id) {
	if (!P[id]) P[id] = { afk: false, lastActivity: Date.now(), warned: false, mutedUntil: 0, lastMsgAt: 0, lastMsg: "", strikes: 0, lastCall: 0 };
	return P[id];
}
function team(t) { return room.getPlayerList().filter(p => p.team === t); }
function nameOf(id) { const p = room.getPlayer(id); return p ? p.name : "?"; }
function teamName(t) { return t === 1 ? "🔴 Rojo" : t === 2 ? "🔵 Azul" : "⚪ Espectadores"; }
function pointDistance(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function shortName(n) { return n.length > 14 ? n.slice(0, 13) + "…" : n; }
function fmtClock(sec) { return Math.floor(sec / 60) + ":" + (sec % 60 < 10 ? "0" : "") + (sec % 60); }
function secondsToMinutes(time) {
	const mins = ~~((time % 3600) / 60), secs = ~~time % 60;
	return mins + ":" + (secs < 10 ? "0" : "") + secs;
}
function blink(id, avatar) {
	for (let i = 0; i <= 13; i++) {
		setTimeout(() => { try { room.setPlayerAvatar(id, i % 2 === 0 ? avatar : null); } catch (e) {} }, i * 250);
	}
}
function findPlayer(arg) {
	if (!arg) return null;
	const list = room.getPlayerList();
	if (arg[0] === "#") return list.find(p => p.id === parseInt(arg.slice(1), 10)) || null;
	const a = arg.toLowerCase().replace(/_/g, " ");
	const exact = list.find(p => p.name.toLowerCase() === a);
	if (exact) return exact;
	const m = list.filter(p => p.name.toLowerCase().includes(a));
	return m.length === 1 ? m[0] : null;
}
function postWebhook(url, payload) {
	if (!url || typeof XMLHttpRequest === "undefined") return;
	try {
		const x = new XMLHttpRequest();
		x.open("POST", url);
		x.setRequestHeader("Content-type", "application/json");
		x.send(JSON.stringify(Object.assign({ username: CONFIG.roomName.slice(0, 80) }, payload)));
	} catch (e) { console.error(e); }
}
function customDate() {
	const d = new Date(), z = n => String(n).padStart(2, "0");
	return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + "-" + z(d.getHours()) + "h" + z(d.getMinutes()) + "m";
}

/*====================== CUENTAS, RANGOS Y ELO ======================*/
// 8 rangos por Elo (el Elo puede ser NEGATIVO). Cambia nombres, emojis y colores a gusto.
const RANKS = [
	{ name: "Cono",      emoji: "⚫", min: -Infinity, color: 0xB0B7C3 },
	{ name: "Suplente",  emoji: "🟤", min: 900,  color: 0xD9A066 },
	{ name: "Titular",   emoji: "🟢", min: 1050, color: 0x7CFC9A },
	{ name: "Capitán",   emoji: "🔵", min: 1200, color: 0x66C7FF },
	{ name: "Crack",     emoji: "🟣", min: 1350, color: 0xC77DFF },
	{ name: "Estrella",  emoji: "⭐", min: 1500, color: 0xFFD60A },
	{ name: "Leyenda",   emoji: "🔥", min: 1700, color: 0xFF8C42 },
	{ name: "Galáctico", emoji: "💎", min: 1900, color: 0xFF4D6D }
];
function rankOf(elo) { let r = RANKS[0]; RANKS.forEach(x => { if (elo >= x.min) r = x; }); return r; }
function nextRank(elo) { return RANKS.find(x => x.min > elo) || null; }

// ---------- Almacenamiento: navegador (localStorage) + NUBE (Firebase) ----------
const ACC_KEY = "rsr_accounts_v1";
let accounts = {};
try { accounts = JSON.parse(localStorage.getItem(ACC_KEY) || "{}") || {}; } catch (e) { accounts = {}; }

const CLOUD_URL = String(CONFIG.cloudDB || "").trim().replace(/\/+$/, "").replace(/\.json$/, "");
const cloudOn = /^https:\/\/[^\s]+$/.test(CLOUD_URL) && CLOUD_URL.indexOf("TUPROYECTO") === -1;
let cloudReady = false;       // true cuando ya se descargó lo que había en la nube (hasta entonces NO se sube nada, para no borrar cuentas)
let cloudDirty = false;       // hubo cambios mientras la nube no estaba lista
let cloudLastOk = 0;
let cloudLastErr = "";

function cloudPush(cb) {
	try {
		fetch(CLOUD_URL + "/accounts.json", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(accounts) })
			.then(r => { if (!r.ok) throw new Error("HTTP " + r.status); cloudLastOk = Date.now(); cloudLastErr = ""; if (cb) cb(true); })
			.catch(e => { cloudLastErr = String(e); console.error("☁️ Error al guardar en la nube:", e); if (cb) cb(false); });
	} catch (e) { cloudLastErr = String(e); console.error(e); if (cb) cb(false); }
}
function saveAccounts(cb) {
	try { localStorage.setItem(ACC_KEY, JSON.stringify(accounts)); } catch (e) {}
	if (!cloudOn) { if (cb) cb(false); return; }
	if (!cloudReady) { cloudDirty = true; if (cb) cb(false); return; }
	cloudPush(cb);
}
function saveStats() { saveAccounts(); }

// Mezcla: gana la cuenta con más partidas (o la de la nube si empatan)
function mergeAccounts(remote) {
	Object.keys(remote || {}).forEach(k => {
		const r = remote[k];
		if (!r || typeof r !== "object") return;
		if (!accounts[k] || (r.games || 0) >= (accounts[k].games || 0)) accounts[k] = r;
	});
}
function cloudLoad() {
	if (!cloudOn) { console.log("☁️ Nube DESACTIVADA (cloudDB vacío o sin configurar). Las cuentas solo se guardan en este navegador."); return; }
	fetch(CLOUD_URL + "/accounts.json")
		.then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
		.then(remote => {
			mergeAccounts(remote);
			cloudReady = true;
			cloudLastErr = "";
			cloudPush(ok => console.log(ok ? "☁️ Nube conectada · cuentas: " + Object.keys(accounts).length : "☁️ Nube leída pero no se pudo escribir (revisa las Rules)"));
			try { localStorage.setItem(ACC_KEY, JSON.stringify(accounts)); } catch (e) {}
			// inicia sesión automática a quienes ya estaban dentro mientras cargaba la nube
			room.getPlayerList().forEach(p => {
				if (sessions[p.id] || !CONFIG.accounts.autoLoginByAuth || !p.auth) return;
				const k = findByAuth(p.auth);
				if (k && claimSession(k, p)) {
					const a = accounts[k], r = rankOf(a.elo);
					whisper("🔐 Sesión iniciada como " + a.user + " · " + r.emoji + " " + r.name + " · Elo " + a.elo, p.id, r.color, "bold");
				}
			});
		})
		.catch(e => {
			cloudLastErr = String(e);
			console.error("☁️ No se pudo leer la nube, reintento en 15 s:", e);
			setTimeout(cloudLoad, 15000);
		});
}
// reintento de guardado si quedaron cambios pendientes
setInterval(() => { if (cloudOn && cloudReady && cloudDirty) { cloudDirty = false; cloudPush(ok => { if (!ok) cloudDirty = true; }); } }, 20000);

let storageOK = true; // ¿el navegador del host puede guardar datos? (en incógnito o con bloqueadores NO)
try { localStorage.setItem("rsr_test", "1"); storageOK = localStorage.getItem("rsr_test") === "1"; localStorage.removeItem("rsr_test"); } catch (e) { storageOK = false; }
(function () { // se mezcla el respaldo del código con lo guardado (gana la cuenta con más partidas)
	mergeAccounts(CONFIG.importAccounts || {});
	try { localStorage.setItem(ACC_KEY, JSON.stringify(accounts)); } catch (e) {}
	console.log("💾 Cuentas cargadas (local): " + Object.keys(accounts).length + (storageOK ? "" : " · ⚠️ ESTE NAVEGADOR NO PUEDE GUARDAR DATOS (¿incógnito?). " + (cloudOn ? "La nube las guardará." : "Configura cloudDB o usa !backup")));
})();
const sessions = {};          // id de jugador -> usuario (en minúsculas) con sesión iniciada

function cyrb53(str, seed) {
	let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
	for (let i = 0, ch; i < str.length; i++) {
		ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
function hashPass(pass, salt) { return cyrb53(salt + ":" + pass, 7) + cyrb53(pass + ":" + salt, 13); }
function newSalt() { return Math.random().toString(36).slice(2, 10); }

function accAuths(a) { return (a.auths || []).concat(a.auth ? [a.auth] : []); }
function findByAuth(auth) { return auth ? Object.keys(accounts).find(k => accAuths(accounts[k]).includes(auth)) : undefined; }
// Toma la sesión de una cuenta. Si ya la tenía otra conexión del MISMO navegador (mismo auth), se la pasa; si es de otra persona, la niega.
function claimSession(key, player) {
	const holder = Object.keys(sessions).find(id => sessions[id] === key);
	if (holder !== undefined) {
		const hp = room.getPlayer(parseInt(holder, 10));
		if (hp && !(player.auth && hp.auth === player.auth)) return false;
		delete sessions[holder];
		if (hp) whisper("🔁 Tu sesión se movió a otra conexión tuya.", hp.id, COLOR.warn);
	}
	sessions[player.id] = key;
	return true;
}
function accOf(p) { const k = p && sessions[p.id]; return k ? accounts[k] || null : null; }
function levelOf(a) {
	if (!a) return 0;
	return 1 + Math.floor((a.games * 10 + a.wins * 15 + a.goals * 5 + a.assists * 3) / 50);
}
// Cuenta del jugador; si no está registrado devuelve un objeto temporal (NO se guarda)
function statFor(p) {
	return accOf(p) || { goals: 0, assists: 0, og: 0, games: 0, wins: 0, draws: 0, losses: 0, elo: CONFIG.elo.start };
}
function allAccounts() { return Object.keys(accounts).map(k => accounts[k]); }
function ladder(key) {
	return allAccounts().filter(a => key === "elo" ? a.games > 0 : a[key] > 0).sort((x, y) => y[key] - x[key]);
}

// Línea de chat con estilo: 🔴 💎 [Galáctico] | Nombre 「Lvl 12」: mensaje  (color según el rango)
function chatLine(player, text) {
	const a = accOf(player);
	const r = a ? rankOf(a.elo) : RANKS[0];
	const side = player.team === 1 ? "🔴" : player.team === 2 ? "🔵" : "⚪";
	const badge = isOwner(player) ? "👑 " : (player.admin ? "🛡 " : "");
	return { msg: side + " " + badge + r.emoji + " [" + r.name + "] | " + player.name + " 「Lvl " + levelOf(a) + "」: " + text, color: r.color };
}

function showStats(a, toId) {
	const r = rankOf(a.elo), nr = nextRank(a.elo);
	const all = allAccounts().sort((x, y) => y.elo - x.elo);
	const pct = a.games ? Math.round(a.wins / a.games * 100) : 0;
	const gpg = a.games ? (a.goals / a.games).toFixed(2) : "0.00";
	whisper("━━━━━ 📊 " + a.user + " ━━━━━", toId, r.color, "bold");
	whisper(r.emoji + " Rango: " + r.name + " · Elo " + a.elo + " · Lvl " + levelOf(a) + " · Puesto #" + (all.indexOf(a) + 1) + " de " + all.length, toId, r.color, "bold");
	whisper("🎮 PJ " + a.games + " · ✅ V " + a.wins + " · 🤝 E " + a.draws + " · ❌ D " + a.losses + " · 📈 Win " + pct + "%", toId, COLOR.info);
	whisper("⚽ Goles " + a.goals + " (" + gpg + " por partido) · 🅰️ Asistencias " + a.assists + " · 😅 Autogoles " + a.og, toId, COLOR.info);
	if (nr) whisper("⬆️ Faltan " + (nr.min - a.elo) + " de Elo para " + nr.emoji + " " + nr.name, toId, COLOR.whisper);
	else whisper("💎 Rango máximo alcanzado.", toId, COLOR.ok);
}

const TOPS = {
	elo: { key: "elo", title: "🏆 TOP 10 · ELO" },
	goles: { key: "goals", title: "⚽ TOP 10 · GOLES" },
	asist: { key: "assists", title: "🅰️ TOP 10 · ASISTENCIAS" },
	wins: { key: "wins", title: "✅ TOP 10 · VICTORIAS" }
};
function topKind(arg) {
	const a = (arg || "").toLowerCase();
	if (a.startsWith("g")) return TOPS.goles;
	if (a.startsWith("a")) return TOPS.asist;
	if (a.startsWith("w") || a.startsWith("v")) return TOPS.wins;
	return TOPS.elo;
}
function showTop(t, toId) {
	const rows = ladder(t.key).slice(0, 10);
	if (!rows.length) { whisper("📭 Todavía no hay datos. ¡Regístrate con !register y juega!", toId, COLOR.warn); return; }
	whisper("━━━━━ " + t.title + " ━━━━━", toId, COLOR.brand, "bold");
	const medal = ["🥇", "🥈", "🥉"];
	rows.forEach((a, n) => {
		const r = rankOf(a.elo);
		const pct = a.games ? Math.round(a.wins / a.games * 100) : 0;
		const val = t.key === "elo" ? a.elo + " · " + r.emoji + " " + r.name + " · " + pct + "% win" : a[t.key];
		whisper((medal[n] || (n + 1) + ".") + " " + a.user + " — " + val, toId, t.key === "elo" ? r.color : COLOR.info, n < 3 ? "bold" : "normal");
	});
}

// Elo por equipos: se compara el promedio de cada equipo (los no registrados cuentan como Elo inicial)
function applyElo(winner, scores, red, blue) {
	const start = CONFIG.elo.start;
	const avg = list => list.length ? list.reduce((sum, p) => { const a = accOf(p); return sum + (a ? a.elo : start); }, 0) / list.length : start;
	const expRed = 1 / (1 + Math.pow(10, (avg(blue) - avg(red)) / 400));
	const sRed = winner === 1 ? 1 : winner === 2 ? 0 : 0.5;
	const margin = winner === 0 ? 1 : Math.min(1.5, 1 + 0.15 * (Math.abs(scores.red - scores.blue) - 1)); // goleadas suman un poco más
	const dRed = Math.round(CONFIG.elo.k * margin * (sRed - expRed));
	const changes = [];
	red.concat(blue).forEach(p => {
		const a = accOf(p);
		if (!a) return;
		const d = p.team === 1 ? dRed : -dRed;
		const before = rankOf(a.elo);
		a.elo += d;
		changes.push({ p: p, d: d, elo: a.elo, before: before, after: rankOf(a.elo) });
	});
	return { dRed: dRed, changes: changes };
}
function signed(n) { return (n >= 0 ? "+" : "") + n; }
function reportElo(winner, info2, red, blue) {
	if (info2.changes.length) {
		announce("📈 Elo · 🔴 " + signed(info2.dRed) + " · 🔵 " + signed(-info2.dRed), null, COLOR.brand, "small");
		info2.changes.forEach(c => {
			whisper("📊 Elo " + signed(c.d) + " → " + c.elo + " · " + c.after.emoji + " " + c.after.name, c.p.id, c.after.color, "bold");
			if (c.after !== c.before) {
				const up = RANKS.indexOf(c.after) > RANKS.indexOf(c.before);
				announce((up ? "⬆️ " : "⬇️ ") + c.p.name + (up ? " sube a " : " baja a ") + c.after.emoji + " " + c.after.name + "!", null, c.after.color, "bold", up ? 1 : 0);
			}
		});
	}
	red.concat(blue).forEach(p => {
		if (!accOf(p)) whisper("💾 No estás registrado: esta partida NO se guardó. Usa !register <usuario> <clave>", p.id, COLOR.warn, "bold");
	});
}

// Staff: el dueño (SuperAdmin) está en ownerAuths; los admins normales en adminAuths o con !admin nombre
const STAFF_KEY = "rsr_staff_v1";
let staffSaved = [];
try { staffSaved = JSON.parse(localStorage.getItem(STAFF_KEY) || "[]") || []; } catch (e) { staffSaved = []; }
function saveStaff() { try { localStorage.setItem(STAFF_KEY, JSON.stringify(staffSaved)); } catch (e) {} }
const staffIds = new Set();   // ids de staff presentes en la sala (el evento de admin no siempre trae el auth)
function isStaff(p) {
	return !!(p && (isOwner(p) || staffIds.has(p.id)
		|| (p.auth && (CONFIG.adminAuths.includes(p.auth) || staffSaved.some(x => x.auth === p.auth)))
		|| (p.conn && CONFIG.adminConns.includes(p.conn))));
}

/*====================== COLA, PICKS Y GANA-SIGUE ======================*/
function syncQueue() {
	const list = room.getPlayerList();
	const specs = new Set(list.filter(p => p.team === 0).map(p => p.id));
	queue = queue.filter(id => specs.has(id) && !info(id).afk);
	list.forEach(p => { if (p.team === 0 && !info(p.id).afk && !queue.includes(p.id)) queue.push(p.id); });
}

function scheduleCheck(ms) {
	if (checkTimer) clearTimeout(checkTimer);
	checkTimer = setTimeout(checkState, ms === undefined ? 300 : ms);
}

function waitNotice(msg) {
	if (msg !== lastWaitNotice || Date.now() - lastWaitAt > 45000) {
		lastWaitNotice = msg; lastWaitAt = Date.now();
		announce(msg, null, COLOR.warn);
	}
}

function checkState() {
	checkTimer = null;
	syncQueue();
	if (autoHold) return;
	if (draft) { draftValidate(); return; }
	if (state === "ending") return;
	if (room.getScores() !== null) { runningMaintenance(); return; }
	formTeams();
}

// Orden de picks uno por uno: rojo, azul, rojo, azul...
function alternateOrder(redPicks, bluePicks) {
	const o = [];
	let r = redPicks, b = bluePicks;
	while (r > 0 || b > 0) {
		if (r > 0) { o.push(1); r--; }
		if (b > 0) { o.push(2); b--; }
	}
	return o;
}

// Capitán actual de un equipo (el que eligió; si ya no está, el primero del equipo)
function captainOf(t) {
	const list = team(t);
	return list.find(p => p.id === captainIds[t]) || list[0] || null;
}

// Mapa según jugadores: 1v1 / 2v2 → Classic · 3v3 en adelante → Real Soccer Revolution
function applyMap() {
	if (room.getScores() !== null) return;
	const kind = Math.min(team(1).length, team(2).length) >= 3 ? "rsr" : "classic";
	if (kind === currentMap) return;
	try {
		if (kind === "classic") room.setDefaultStadium("Classic"); else room.setCustomStadium(getRSRMap());
		currentMap = kind;
		announce(kind === "classic" ? "🗺 Mapa: Classic (1v1 / 2v2)" : "🗺 Mapa: " + CONFIG.stadiumName + " (3v3 / 4v4)", null, COLOR.brand, "small");
	} catch (e) { console.error(e); }
}

function formTeams() {
	const red = team(1), blue = team(2);
	// el equipo que se queda siempre juega de ROJO
	if (!red.length && blue.length) {
		blue.forEach(p => room.setPlayerTeam(p.id, 1));
		captainIds[1] = captainIds[2];
		scheduleCheck(300);
		return;
	}
	const total = red.length + blue.length + queue.length;
	if (total < 2) { waitNotice("⏳ Esperando jugadores... (mínimo 2)"); return; }
	if (red.length && blue.length) { balanceTeams(); startMatch(); return; }

	if (!red.length && !blue.length) { // equipos vacíos: dos capitanes (el 1º a rojo, el 2º a azul)
		const size = Math.min(CONFIG.teamSize, Math.floor(total / 2));
		if (CONFIG.picks.enabled && total >= CONFIG.picks.minPlayers && size > 1) {
			const caps = {}; caps[1] = queue[0]; caps[2] = queue[1];
			startDraft({ captains: caps, size: size, order: alternateOrder(size - 1, size - 1) });
		} else {
			queue.slice(0, size * 2).forEach((id, i) => room.setPlayerTeam(id, i % 2 === 0 ? 1 : 2));
			syncQueue();
			scheduleCheck(500);
		}
		return;
	}

	// el rojo se queda y entra el retador (azul)
	const size = Math.min(CONFIG.teamSize, Math.floor(total / 2));
	const stayCount = red.length;
	const need = Math.min(CONFIG.teamSize, Math.max(size, stayCount));   // tamaño del retador
	const pool = queue.slice();
	if (pool.length === 0) { waitNotice("⏳ Esperando rival para " + teamName(1) + "..."); return; }
	const redPicks = Math.max(0, size - stayCount), bluePicks = Math.max(0, need - 1);
	if (CONFIG.picks.enabled && need > 1 && pool.length - 1 > redPicks + bluePicks && total >= CONFIG.picks.minPlayers) {
		const caps = {}; caps[1] = (captainOf(1) || red[0]).id; caps[2] = pool[0];
		startDraft({ captains: caps, size: need, order: alternateOrder(redPicks, bluePicks) });
	} else {
		let sc = stayCount;
		while (sc < size && queue.length > 0) { room.setPlayerTeam(queue.shift(), 1); sc++; }
		queue.slice(0, need).forEach(id => room.setPlayerTeam(id, 2));
		syncQueue();
		scheduleCheck(500);
	}
}

function balanceTeams() {
	const r = team(1), b = team(2);
	while (Math.abs(r.length - b.length) >= 2) {
		const big = r.length > b.length ? r : b, small = big === r ? b : r;
		const p = big.splice(Math.floor(Math.random() * big.length), 1)[0];
		small.push(p);
		const to = small === r ? 1 : 2;
		room.setPlayerTeam(p.id, to);
		announce("⚖️ " + p.name + " pasa a " + teamName(to) + " para equilibrar.");
	}
}

function startMatch() {
	if (room.getScores() !== null) return;
	if (!team(1).length || !team(2).length) return;
	applyMap();
	room.setTimeLimit(0);
	room.setScoreLimit(CONFIG.scoreLimit);
	room.startGame();
}

// Mientras se juega: vacantes (un jugador se fue) y equipos vacíos
function runningMaintenance() {
	if (!game || game.finished || draft) return;
	const r = team(1).length, b = team(2).length;

	if (r === 0 || b === 0) {
		if (queue.length > 0) { // hay gente esperando: se reinicia con equipos nuevos
			announce("⚠️ Un equipo quedó sin jugadores: se reinicia el partido.", null, COLOR.warn);
			pendingResult = null;
			room.stopGame();
			return;
		}
		if (!emptyTimer) {
			announce("⚠️ Un equipo quedó sin jugadores. La partida se cierra en 15 s si nadie entra.", null, COLOR.warn);
			emptyTimer = setTimeout(() => {
				emptyTimer = null;
				if (room.getScores() !== null && (team(1).length === 0 || team(2).length === 0)) { pendingResult = null; room.stopGame(); }
			}, 15000);
		}
		return;
	}
	if (emptyTimer) { clearTimeout(emptyTimer); emptyTimer = null; }

	const vac = { 1: Math.max(0, game.sizes[1] - r), 2: Math.max(0, game.sizes[2] - b) };
	if ((vac[1] > 0 || vac[2] > 0) && queue.length > 0) {
		if (queue.length === 1) { // un solo espectador: sube automáticamente
			const id = queue.shift();
			const t = vac[1] > 0 && vac[2] > 0 ? (r <= b ? 1 : 2) : (vac[1] > 0 ? 1 : 2);
			room.setPlayerTeam(id, t);
			announce("➕ " + nameOf(id) + " entra a " + teamName(t) + ".", null, t === 1 ? COLOR.red : COLOR.blue);
			return;
		}
		// 2 o más espectadores: la partida se pausa y el capitán elige el reemplazo
		const caps = {};
		[1, 2].forEach(t => { if (vac[t] > 0) { const c = captainOf(t); if (c) caps[t] = c.id; } });
		startDraft({ type: "replace", captains: caps, size: 0, order: alternateOrder(vac[1], vac[2]) });
	}
}

// ---------- Picks ----------
function startDraft(cfg) {
	draft = { type: cfg.type || "fresh", captains: cfg.captains, order: cfg.order, idx: 0, size: cfg.size, picked: [], snapshot: [], timer: null };
	state = "picking";
	Object.keys(cfg.captains).forEach(t => {
		const tid = parseInt(t, 10);
		captainIds[tid] = cfg.captains[t];
		if (draft.type !== "replace") room.setPlayerTeam(cfg.captains[t], tid);
		queue = queue.filter(id => id !== cfg.captains[t]);
	});
	const c = cfg.captains;
	if (draft.type === "replace") {
		try { room.pauseGame(true); } catch (e) {}
		announce("⏸ Se fue un jugador: partida en pausa hasta que el capitán elija reemplazo.", null, COLOR.warn, "bold", 1);
	} else {
		announce("🎯 PICKS · " + (c[1] ? "🔴 " + nameOf(c[1]) : "") + (c[1] && c[2] ? " vs " : "") + (c[2] ? "🔵 " + nameOf(c[2]) : "") + " · equipos de " + cfg.size, null, COLOR.brand, "bold", 1);
	}
	draftNext();
}

function clearDraftTimer() { if (draft && draft.timer) { clearTimeout(draft.timer); draft.timer = null; } }

function draftPool() {
	const taken = draft ? draft.picked.concat(Object.values(draft.captains)) : [];
	return queue.filter(id => !taken.includes(id));
}

function draftNext() {
	if (!draft) return;
	clearDraftTimer();
	syncQueue();
	const pool = draftPool();
	if (draft.idx >= draft.order.length || pool.length === 0) { finishDraft(); return; }
	const teamId = draft.order[draft.idx];
	const cap = draft.captains[teamId];
	if (cap === undefined || !room.getPlayer(cap)) { abortDraft("el capitán se fue"); return; }
	if (pool.length === 1) { doPick(teamId, pool[0], true); return; }
	draft.snapshot = pool.slice();
	showPool(teamId);
	draft.timer = setTimeout(() => captainTimeout(), CONFIG.picks.turnSeconds * 1000);
}

// UN solo mensaje: "🔴 Doku elige [1:15] ➜ 1 James · 2 Castro · 3 Pedro"
function showPool(teamId, onlyTo) {
	const cap = draft.captains[teamId];
	const list = draft.snapshot.map((id, i) => (i + 1) + " " + shortName(nameOf(id))).join(" · ");
	const msg = (teamId === 1 ? "🔴 " : "🔵 ") + shortName(nameOf(cap)) + " elige [" + fmtClock(CONFIG.picks.turnSeconds) + "] ➜ " + list;
	const color = teamId === 1 ? COLOR.red : COLOR.blue;
	if (onlyTo !== undefined) whisper(msg, onlyTo, color, "bold");
	else announce(msg, null, color, "bold", 2);
}

function pickPlayer(p, argRaw) {
	if (!draft) { whisper("ℹ️ No hay picks en curso.", p.id); return; }
	const teamId = draft.order[draft.idx];
	if (draft.captains[teamId] !== p.id) { whisper("⛔ No es tu turno de elegir.", p.id); return; }
	const arg = (argRaw || "").trim().toLowerCase();
	if (arg === "") { showPool(teamId, p.id); return; }
	let id;
	if (arg === "r" || arg === "random") {
		const pool = draftPool(); id = pool[Math.floor(Math.random() * pool.length)];
	} else if (/^\d+$/.test(arg)) {
		id = draft.snapshot[parseInt(arg, 10) - 1];
	} else {
		const m = draft.snapshot.filter(i => nameOf(i).toLowerCase().includes(arg));
		if (m.length > 1) { whisper("❓ Varios coinciden, usa el número.", p.id); return; }
		id = m[0];
	}
	const target = id === undefined ? null : room.getPlayer(id);
	if (!target || target.team !== 0 || info(id).afk || !draftPool().includes(id)) { whisper("❌ Elección inválida.", p.id); return; }
	doPick(teamId, id, false);
}

function doPick(teamId, id, auto) {
	room.setPlayerTeam(id, teamId);
	queue = queue.filter(x => x !== id);
	draft.picked.push(id);
	draft.idx++;
	const cap = draft.captains[teamId];
	announce((teamId === 1 ? "🔴 " : "🔵 ") + nameOf(cap) + (auto ? " (auto)" : "") + " elige a " + nameOf(id), null, teamId === 1 ? COLOR.red : COLOR.blue, "bold", 1);
	draftNext();
}

function autoPick() {
	if (!draft) return;
	const pool = draftPool();
	if (!pool.length) { finishDraft(); return; }
	const teamId = draft.order[draft.idx];
	announce("⏱ " + nameOf(draft.captains[teamId]) + " tardó demasiado: se elige automáticamente.", null, COLOR.warn);
	doPick(teamId, pool[0], true);
}

// Se acabó el tiempo (1:15): se expulsa al capitán y elige el siguiente
function captainTimeout() {
	if (!draft) return;
	const teamId = draft.order[draft.idx];
	const capId = draft.captains[teamId];
	let next = null;
	if (CONFIG.picks.kickIdleCaptain) {
		if (draft.type === "replace") {
			const mate = team(teamId).find(p => p.id !== capId);
			next = mate ? mate.id : null;
		} else {
			const pool = draftPool();
			next = pool.length > 1 ? pool[0] : null;
		}
	}
	if (next === null) { autoPick(); return; }
	announce("⏱ " + nameOf(capId) + " no eligió a tiempo y fue expulsado. Nuevo capitán: " + nameOf(next) + ".", null, COLOR.warn, "bold", 1);
	draft.captains[teamId] = next;
	captainIds[teamId] = next;
	if (draft.type !== "replace") { room.setPlayerTeam(next, teamId); queue = queue.filter(id => id !== next); }
	room.kickPlayer(capId, "⏱ No elegiste a tiempo como capitán.", false);
	draftNext();
}

function finishDraft() {
	clearDraftTimer();
	const d = draft;
	draft = null;
	if (d && d.type === "replace") {
		state = "playing";
		announce("✅ Reemplazo listo. ¡Sigue el partido!", null, COLOR.ok);
		try { room.pauseGame(false); } catch (e) {}
		scheduleCheck(800);
		return;
	}
	state = "waiting";
	balanceTeams();
	announce("✅ Equipos listos. ¡Que empiece el partido!", null, COLOR.ok);
	scheduleCheck(1500);
}

function abortDraft(reason) {
	if (!draft) return;
	clearDraftTimer();
	const d = draft;
	draft = null;
	if (d.type === "replace") { // el partido sigue con los equipos que haya
		state = "playing";
		try { room.pauseGame(false); } catch (e) {}
		announce("⚠️ Reemplazo cancelado: " + reason + ".", null, COLOR.warn);
		scheduleCheck(800);
		return;
	}
	state = "waiting";
	announce("⚠️ Picks cancelados: " + reason + ".", null, COLOR.warn);
	const back = Object.values(d.captains).concat(d.picked).filter((id, i, a) => a.indexOf(id) === i && room.getPlayer(id));
	back.forEach(id => room.setPlayerTeam(id, 0));
	queue = back.concat(queue.filter(id => !back.includes(id)));
	scheduleCheck(500);
}

function draftValidate() {
	if (!draft) return;
	const caps = Object.keys(draft.captains);
	for (let i = 0; i < caps.length; i++) {
		const t = parseInt(caps[i], 10);
		const id = draft.captains[caps[i]];
		const p = room.getPlayer(id);
		if (!p || p.team !== t) {
			if (draft.type === "replace") { // otro jugador del equipo toma el rol de capitán
				const alt = team(t).find(x => x.id !== id);
				if (alt) { draft.captains[caps[i]] = alt.id; captainIds[t] = alt.id; if (draft.order[draft.idx] === t) draftNext(); continue; }
				abortDraft("el equipo se quedó sin jugadores"); return;
			}
			abortDraft("el capitán " + (p ? p.name : "") + " ya no está disponible"); return;
		}
	}
	if (draftPool().length === 0) finishDraft();
}

function finishMatch(scores, byTime) {
	if (!game || game.finished) return;
	game.finished = true;
	state = "ending";
	const winner = scores.red > scores.blue ? 1 : scores.blue > scores.red ? 2 : 0;
	const red = team(1), blue = team(2);
	const eloInfo = applyElo(winner, scores, red, blue);
	red.concat(blue).forEach(p => {
		const s = statFor(p);
		s.games++;
		if (winner === 0) s.draws++; else if (p.team === winner) s.wins++; else s.losses++;
	});
	saveStats();
	announce(winner === 0 ? "🤝 EMPATE " + scores.red + " - " + scores.blue
		: "🏆 Gana " + teamName(winner) + " " + scores.red + " - " + scores.blue, null, winner === 1 ? COLOR.red : winner === 2 ? COLOR.blue : COLOR.info, "bold", 1);
	reportElo(winner, eloInfo, red, blue);
	pendingResult = { winner: winner, red: scores.red, blue: scores.blue };
	let data = null;
	try { data = room.stopRecording(); } catch (e) {}
	uploadReplay(scores, red, blue, data);
	if (byTime) setTimeout(() => { if (room.getScores() !== null) room.stopGame(); }, 1500);
	setTimeout(() => { if (state === "ending" && room.getScores() !== null) room.stopGame(); }, 20000); // seguro
}

function uploadReplay(scores, red, blue, data) {
	const url = CONFIG.discord.replays;
	if (!data || !url || typeof FormData === "undefined") return;
	try {
		const stamp = customDate();
		const form = new FormData();
		form.append("files[0]", new File([data], "RSR-" + stamp + ".hbr2", { type: "text/plain" }));
		form.append("payload_json", JSON.stringify({
			username: CONFIG.roomName.slice(0, 80),
			embeds: [{
				title: CONFIG.stadiumName, color: 2078513,
				fields: [
					{ name: "ROJO", value: (red.map(p => p.name).join("\n") || "—") + "\n**GOLES** " + scores.red, inline: true },
					{ name: "AZUL", value: (blue.map(p => p.name).join("\n") || "—") + "\n**GOLES** " + scores.blue, inline: true },
					{ name: "TIEMPO", value: secondsToMinutes(scores.time) }
				],
				footer: { text: "RSR-" + stamp }
			}]
		}));
		const x = new XMLHttpRequest();
		x.open("POST", url);
		x.send(form);
	} catch (e) { console.error(e); }
}

function rotateAfterMatch(res) {
	state = "waiting";
	syncQueue();
	const redIds = team(1).map(p => p.id), blueIds = team(2).map(p => p.id);
	let leaving = [], moveToRed = [];
	if (res.winner === 0) { // empate: salen los dos equipos y entran dos nuevos capitanes
		for (let i = 0; i < Math.max(redIds.length, blueIds.length); i++) {
			if (i < redIds.length) leaving.push(redIds[i]);
			if (i < blueIds.length) leaving.push(blueIds[i]);
		}
		incumbent = 0; streak = 0;
		announce("🤝 Empate: salen los dos equipos. Entran nuevos capitanes.", null, COLOR.info);
	} else { // gana uno: se queda (siempre de ROJO, mismos jugadores) y el otro sale
		const winIds = res.winner === 1 ? redIds : blueIds;
		const loseIds = res.winner === 1 ? blueIds : redIds;
		streak = (res.winner === 1 && incumbent === 1) ? streak + 1 : 1;
		incumbent = 1;
		leaving = loseIds.slice();
		if (res.winner === 2) { moveToRed = winIds; captainIds[1] = captainIds[2]; }
		if (streak > 1) announce("🔥 El equipo ganador lleva " + streak + " victorias seguidas.", null, COLOR.ok);
		if (CONFIG.maxStreak > 0 && streak >= CONFIG.maxStreak && queue.length > 0) {
			announce("🏅 El equipo ganador completó " + streak + " victorias seguidas y descansa.", null, COLOR.ok);
			leaving = leaving.concat(winIds);
			moveToRed = [];
			incumbent = 0; streak = 0;
		}
	}
	leaving.forEach(id => room.setPlayerTeam(id, 0));
	moveToRed.forEach(id => room.setPlayerTeam(id, 1));
	queue = queue.filter(id => !leaving.includes(id) && !moveToRed.includes(id)).concat(leaving);
	scheduleCheck(2500);
}

/*=============================== EVENTOS ==============================*/
room.onRoomLink = function (url) { roomLink = url; console.log(roomLink); };

room.onStadiumChange = function (name, byPlayer) {
	if (!byPlayer) return;
	const want = currentMap === "classic" ? "Classic" : CONFIG.stadiumName;
	if (name !== want) {
		whisper("❌ El mapa lo elige el bot según los jugadores (Classic 1v1/2v2 · RSR 3v3/4v4).", byPlayer.id);
		setTimeout(() => { try { if (currentMap === "classic") room.setDefaultStadium("Classic"); else room.setCustomStadium(getRSRMap()); } catch (e) {} }, 100);
	}
};

// 👑 Dueño: se identifica por "auth" (clave pública de tu navegador, no se puede falsificar ni cambia con tu IP)
const sessionOwners = new Set(); // ids que entraron con !owner CLAVE (solo dura mientras estén en la sala)
function isOwner(p) {
	return !!(p && ((p.auth && CONFIG.ownerAuths.includes(p.auth)) || (p.conn && CONFIG.ownerConns.includes(p.conn)) || sessionOwners.has(p.id)));
}

room.onPlayerJoin = function (player) {
	info(player.id);
	console.log("JOIN: " + player.name + " · auth=" + player.auth + " · conn=" + player.conn); // así puedes copiar el auth de alguien desde la consola
	const owner = isOwner(player);
	if (!owner && CONFIG.blacklistConn.includes(player.conn)) { room.kickPlayer(player.id, "🏴 Estás en la lista negra.", true); return; }
	const staff = !owner && isStaff(player);
	if (owner) sessionOwners.add(player.id);
	if (owner || staff) { staffIds.add(player.id); room.setPlayerAdmin(player.id, true); }

	if (owner) {
		whisper("👑 Bienvenido, dueño. SuperAdmin activado automáticamente.", player.id, COLOR.ok, "bold", 2);
		announce("👑 " + player.name + " (dueño) se unió a la sala.", null, COLOR.ok, "small");
		if (player.conn && !CONFIG.ownerConns.includes(player.conn)) whisper("🌐 Tu conn (IP): " + player.conn + "  → pégalo en ownerConns: [\"" + player.conn + "\"] para ser SuperAdmin también desde otros navegadores.", player.id, COLOR.whisper, "bold");
	} else if (staff) {
		whisper("🛡 Bienvenido, admin. Admin activado automáticamente.", player.id, COLOR.warn, "bold", 2);
		announce("🛡 Admin " + player.name + " se unió a la sala.", null, COLOR.warn, "small");
		postWebhook(CONFIG.discord.log, { content: "🛡 Admin " + player.name + " se unió a la sala." });
	} else {
		announce("👤 " + player.name + " se unió a la sala.", null, COLOR.spec, "small");
		postWebhook(CONFIG.discord.log, { content: "👤 " + player.name + " se unió a la sala." });
	}

	// sesión automática si entra con el mismo navegador con el que se registró
	if (CONFIG.accounts.autoLoginByAuth && player.auth) {
		const k = findByAuth(player.auth);
		if (k && claimSession(k, player)) {
			const a = accounts[k], r = rankOf(a.elo);
			whisper("🔐 Sesión iniciada como " + a.user + " · " + r.emoji + " " + r.name + " · Elo " + a.elo, player.id, r.color, "bold");
		}
	}
	if (owner && !cloudOn) whisper("⚠️ La NUBE no está configurada (cloudDB). Las cuentas solo se guardan en este navegador y se pueden perder.", player.id, COLOR.warn, "bold");
	if (owner && cloudOn && !cloudReady) whisper("⚠️ La nube todavía no conectó" + (cloudLastErr ? " (" + cloudLastErr + ")" : "") + ". Revisa !nube", player.id, COLOR.warn, "bold");
	if (owner && !storageOK && !cloudOn) whisper("⚠️ Este navegador NO guarda datos: las cuentas se perderán al cerrar. Configura cloudDB o usa !backup.", player.id, COLOR.warn, "bold");
	whisper("🔆 REAL SOCCER REVOLUTION · 4v4 Gana Sigue", player.id, COLOR.brand, "bold");
	whisper("📜 !comandos ver todo · !stats · !top · !rangos · !afk · !cola", player.id, COLOR.info, "bold");
	if (!sessions[player.id]) whisper("💾 Regístrate para guardar tu Elo, rango y stats:  !register <usuario> <clave>", player.id, COLOR.warn, "bold");
	if (CONFIG.discord.invite) whisper("📢 Discord: " + CONFIG.discord.invite, player.id, COLOR.info, "bold");
	scheduleCheck(500);
};

room.onPlayerLeave = function (player) {
	console.log(player.name + " salió de la sala");
	delete P[player.id];
	delete sessions[player.id];
	staffIds.delete(player.id);
	sessionOwners.delete(player.id);
	queue = queue.filter(id => id !== player.id);
	scheduleCheck(300);
};

room.onPlayerTeamChange = function () { scheduleCheck(300); };
room.onPlayerActivity = function (player) { const i = info(player.id); i.lastActivity = Date.now(); i.warned = false; };

room.onPlayerKicked = function (kicked, reason, ban, by) {
	if (!by || by.id === 0 || kicked.id === by.id) return;
	if (isOwner(by)) return;                                               // el dueño puede todo
	if (isStaff(by) && CONFIG.staffCanKick && !ban) return;                // admin normal: puede kickear, no banear
	room.clearBan(kicked.id);
	if (isStaff(by)) { whisper("❌ Solo el dueño puede " + (ban ? "banear" : "kickear") + " jugadores.", by.id, COLOR.warn); return; }
	if (CONFIG.punishUnauthorizedBans) room.kickPlayer(by.id, "❌ No tienes permitido " + (ban ? "banear" : "kickear") + " jugadores.", false);
};

// Solo el staff (dueño y admins) puede tener admin: a cualquier otro se le quita al instante
room.onPlayerAdminChange = function (changed) {
	if (changed.admin && !isStaff(changed)) room.setPlayerAdmin(changed.id, false);
};

room.onGamePause = function () { if (game) game.paused = true; };
room.onGameUnpause = function () { if (game) game.paused = false; };

room.onGameStart = function (byPlayer) {
	if (byPlayer && byPlayer.id !== 0) { // inicio manual: se reinicia por script para forzar tiempo 0 y límites del bot
		autoHold = false;
		ignoreStops++;
		room.stopGame();
		applyMap();
		room.setTimeLimit(0);
		room.setScoreLimit(CONFIG.scoreLimit);
		room.startGame();
		return;
	}
	if (draft) { clearDraftTimer(); draft = null; }
	autoHold = false;
	game = new Game();
	game.classic = currentMap === "classic";
	game.sizes = { 1: team(1).length, 2: team(2).length };
	state = "playing";
	pendingResult = null;
	lastWaitNotice = "";
	if (incumbent === 0) { streak = 0; }
	room.getPlayerList().forEach(p => { info(p.id).lastActivity = Date.now(); info(p.id).warned = false; });
	if (!game.classic) enforcePhysics(true);
	announce("⚽ " + (game.classic ? "Classic" : CONFIG.stadiumName) + " · " + CONFIG.gameMinutes + " min o " + CONFIG.scoreLimit + " goles · " + team(1).length + "v" + team(2).length, null, COLOR.brand, "bold", 1);
	try { room.startRecording(); } catch (e) {}
};

room.onGameStop = function (byPlayer) {
	if (ignoreStops > 0) { ignoreStops--; return; }
	try { room.stopRecording(); } catch (e) {}
	game = null;
	if (draft) { clearDraftTimer(); draft = null; }
	if (emptyTimer) { clearTimeout(emptyTimer); emptyTimer = null; }
	if (pendingResult) {
		const r = pendingResult; pendingResult = null;
		rotateAfterMatch(r);
		return;
	}
	state = "waiting";
	if (byPlayer && byPlayer.id !== 0) {
		autoHold = true;
		announce("⏸ Partida detenida por " + byPlayer.name + ". Escribe !start para continuar.", null, COLOR.warn);
	} else scheduleCheck(1000);
};

room.onTeamVictory = function (scores) { finishMatch(scores, false); };

room.onPositionsReset = function () {
	if (game) game.goalPause = false;
	if (game && game.lastPlayAnnounced && !game.finished) { game.lastPlayAnnounced = false; endByTime(); }
	if (game) game.freeze = false;
};

room.onTeamGoal = function (teamId) {
	if (!game) return;
	game.rsActive = false;
	game.goalPause = true;
	const goalTime = secondsToMinutes(Math.floor(room.getScores().time));
	const lk = game.lastKicker, sk = game.secondLastKicker;
	let goalType = "GOL!", scorer = "⚽ Gol", assister = "";
	if (lk) {
		const lkp = room.getPlayer(lk.id);
		if (lk.team === teamId) {
			scorer = "⚽ Gol de " + lk.name;
			blink(lk.id, "⚽");
			if (lkp) statFor(lkp).goals++;
			if (sk && sk.team === teamId && sk.id !== lk.id) {
				assister = " (Asistencia: " + sk.name + ")";
				blink(sk.id, "🅰️");
				const sp = room.getPlayer(sk.id);
				if (sp) statFor(sp).assists++;
			}
		} else {
			goalType = "AUTOGOL!";
			scorer = "⚽ Autogol de " + lk.name;
			blink(lk.id, "😭");
			if (lkp) statFor(lkp).og++;
		}
	}
	if (teamId === 1) game.redScore++; else game.blueScore++;
	announce(goalType + " 🟥 " + game.redScore + " - " + game.blueScore + " 🟦 🕒" + goalTime + " " + scorer + assister, null, COLOR.info, "bold", 1);
	game.lastKicker = null;
	game.secondLastKicker = null;
	saveStats();
};

room.onPlayerBallKick = function (player) {
	if (!game || game.finished) return;
	game.rsTouchTeam = player.team;
	game.updateLastKicker(player);

	const wasCorner = game.rsCorner, wasGK = game.rsGoalKick;
	if (!game.rsActive && game.rsReady && (wasCorner || wasGK)) { // el saque de arco / córner se puso en juego
		game.freeze = false;
		enforcePhysics(true);
		game.boosterState = true;
		game.boosterCount = 0;
		game.rsActive = true;
		game.rsReady = false;
		room.setDiscProperties(1, { x: 2000, y: 2000 });
		room.setDiscProperties(2, { x: 2000, y: 2000 });
		room.setDiscProperties(0, { color: BALL_WHITE });
		game.rsTimer = 1000000;
		game.warningCount++;
		const d = room.getPlayerDiscProperties(player.id);
		const ball = room.getDiscProperties(0);
		if (wasCorner && d) { // efecto de córner según la carrera del pateador
			room.setDiscProperties(0, { xgravity: clamp(-d.xspeed / 35, -0.09, 0.09), ygravity: ball.y < 0 ? 0.05 : -0.05 });
		}
		if (wasGK && d) {
			room.setDiscProperties(0, { xgravity: 0, ygravity: clamp(-d.yspeed / 40, -0.08, 0.08) });
		}
		game.rsCorner = false;
		game.rsGoalKick = false;
		game.outStatus = "";
		game.swingGrace = 8; // evita que el propio pateador cancele el efecto
	}
	if (game.outStatus === "redThrow" || game.outStatus === "blueThrow") game.throwinKicked = true;
};

room.onGameTick = function () {
	if (!game || game.finished) return;
	refereeTick();
};

/*============================== ÁRBITRO RSR ===========================*/
class Game {
	constructor() {
		this.ticks = 0;
		this.time = 0;
		this.paused = false;
		this.finished = false;
		this.freeze = false;
		this.ballRadius = 9;
		this.rsTouchTeam = 0;
		this.rsActive = true;
		this.rsReady = false;
		this.rsCorner = false;
		this.rsGoalKick = false;
		this.rsSwingTimer = 1000;
		this.rsTimer = 1000000;
		this.swingGrace = 0;
		this.ballOutPositionX = 0;
		this.throwInPosY = 0;
		this.outStatus = "";
		this.warningCount = 0;
		this.bringThrowBack = false;
		this.pushedOut = false;
		this.throwinKicked = false;
		this.boosterState = false;
		this.boosterCount = 0;
		this.extraTimeCount = 0;
		this.extraTimeEnd = null;
		this.extraTimeAnnounced = false;
		this.lastPlayAnnounced = false;
		this.classic = false;
		this.sizes = { 1: 0, 2: 0 };
		this.goalPause = false;
		this.redScore = 0;
		this.blueScore = 0;
		this.lastKicker = null;
		this.secondLastKicker = null;
	}
	updateLastKicker(p) {
		this.secondLastKicker = this.lastKicker;
		this.lastKicker = { id: p.id, name: p.name, team: p.team };
	}
}

// ejecuta fn solo si sigue siendo la misma partida
function later(ms, fn) {
	const g = game;
	setTimeout(() => {
		if (game && game === g && !g.finished) { try { fn(); } catch (e) { console.error(e); } }
	}, ms);
}

function teamPlayersInGame() { return room.getPlayerList().filter(p => p.team !== 0); }

function enforcePhysics(force) {
	if (!game) return;
	if (!force && game.ticks % 6 !== 0) return;
	const want = game.freeze ? 100000 : REF.playerInvMass;
	teamPlayersInGame().forEach(p => {
		const d = room.getPlayerDiscProperties(p.id);
		if (!d) return;
		const ok = want >= 1000 ? d.invMass >= 99999 : Math.abs(d.invMass - want) < 0.001;
		if (!ok) room.setPlayerDiscProperties(p.id, { invMass: want });
	});
}

function updateGameStatus() {
	const sc = room.getScores();
	if (!sc) return;
	game.time = Math.floor(sc.time);
	game.ballRadius = room.getDiscProperties(0).radius;
	game.ticks++;
}

function handleBallTouch() {
	if (game.swingGrace > 0) game.swingGrace--;
	const ball = room.getBallPosition();
	const trigger = game.ballRadius + 15 + 0.01;
	room.getPlayerList().forEach(p => {
		if (!p.position) return;
		if (pointDistance(p.position, ball) < trigger) {
			game.rsTouchTeam = p.team;
			game.throwinKicked = false;
			if (!game.rsCorner && game.swingGrace === 0 && room.getDiscProperties(0).xgravity !== 0) {
				room.setDiscProperties(0, { xgravity: 0, ygravity: 0 });
				game.rsSwingTimer = 10000;
			}
		}
	});
}

// Tiempo y tiempo extra (sirve para los dos mapas). Suma: córners, saques de arco, bandas y festejos de gol.
function timeTick() {
	if (game.rsCorner || game.rsGoalKick) game.extraTimeCount++;
	if (CONFIG.extraTime.countThrowIns && (game.outStatus === "redThrow" || game.outStatus === "blueThrow")) game.extraTimeCount++;
	if (CONFIG.extraTime.countGoals && game.goalPause) game.extraTimeCount++;
	if (game.time >= CONFIG.gameMinutes * 60 && !game.extraTimeAnnounced) {
		game.extraTimeAnnounced = true;
		const extra = clamp(Math.ceil(game.extraTimeCount / 60), 0, CONFIG.extraTime.maxSeconds);
		game.extraTimeEnd = CONFIG.gameMinutes * 60 + extra;
		announce("⏱ TIEMPO EXTRA: " + extra + " segundos", null, null, null, 1);
	}
	if (game.extraTimeEnd !== null && game.time >= game.extraTimeEnd && !game.lastPlayAnnounced) {
		announce("📢 ÚLTIMA JUGADA.", null, null, null, 1);
		game.lastPlayAnnounced = true;
	}
	// tope de seguridad: si nadie saca ni marca, la última jugada no dura para siempre
	if (game.lastPlayAnnounced && !game.finished) {
		const cap = game.classic ? CONFIG.lastPlayMaxSeconds.classic : CONFIG.lastPlayMaxSeconds.rsr;
		if (game.time >= game.extraTimeEnd + cap) { game.lastPlayAnnounced = false; endByTime(); }
	}
}

function refereeTick() {
	updateGameStatus();
	timeTick();
	if (game.finished || game.classic) return; // en Classic no hay árbitro de saques
	handleBallTouch();
	enforcePhysics(false);
	blockThrowIn();
	blockGoalKick();
	removeBlock();
	if (game.rsTimer < 99999 && !game.paused && !game.rsActive && game.rsReady) game.rsTimer++;

	// decaimiento del efecto
	if (game.rsSwingTimer < 150 && !game.rsCorner && !game.rsGoalKick) {
		game.rsSwingTimer++;
		if (game.rsSwingTimer > 5) {
			const d = room.getDiscProperties(0);
			room.setDiscProperties(0, { xgravity: d.xgravity * 0.97, ygravity: d.ygravity * 0.97 });
		}
		if (game.rsSwingTimer === 150) room.setDiscProperties(0, { xgravity: 0, ygravity: 0 });
	}

	if (game.boosterState) game.boosterCount++;
	if (game.boosterCount > 30) {
		game.boosterState = false;
		game.boosterCount = 0;
		room.setDiscProperties(0, { cMask: 63 });
	}

	const bp = room.getBallPosition();
	if (bp.x === 0 && bp.y === 0) { // saque inicial: se reinicia todo el estado de saques
		game.rsActive = true;
		game.rsReady = false;
		game.rsCorner = false;
		game.rsGoalKick = false;
		game.freeze = false;
		game.outStatus = "";
	}

	if (!game.rsActive && game.rsReady) expireSetPiece();
	if (game.rsActive) detectOutOfBounds();
	checkThrowIn();
}

function ballWarning(color, count) {
	[200, 400, 600, 800, 1000, 1200, 1400, 1600, 1675, 1750].forEach((ms, i) => {
		setTimeout(() => {
			if (game && !game.finished && game.warningCount === count) room.setDiscProperties(0, { color: i % 2 === 0 ? BALL_WHITE : color });
		}, ms);
	});
}

function expireSetPiece() {
	const out = game.outStatus;
	if (out === "redThrow" || out === "blueThrow") {
		const col = out === "redThrow" ? BALL_RED : BALL_BLUE;
		if (game.rsTimer === REF.throwTimeOut - 120) ballWarning(col, ++game.warningCount);
		if (game.rsTimer === REF.throwTimeOut && !game.bringThrowBack) switchThrow(out === "redThrow");
	} else if (out === "blueGK" || out === "redGK") {
		if (game.rsTimer === REF.gkTimeOut - 120) ballWarning(out === "blueGK" ? BALL_BLUE : BALL_RED, ++game.warningCount);
		if (game.rsTimer === REF.gkTimeOut) {
			game.outStatus = "";
			room.setDiscProperties(0, { color: BALL_WHITE });
			game.rsTimer = 1000000;
		}
	} else if (out === "blueCK" || out === "redCK") {
		if (game.rsTimer === REF.ckTimeOut - 120) ballWarning(out === "blueCK" ? BALL_BLUE : BALL_RED, ++game.warningCount);
		if (game.rsTimer === REF.ckTimeOut) { // se libera la zona del córner
			game.outStatus = "";
			room.setDiscProperties(1, { x: 0, y: 2000, radius: 0 });
			room.setDiscProperties(2, { x: 0, y: 2000, radius: 0 });
			room.setDiscProperties(0, { color: BALL_WHITE });
			game.rsTimer = 1000000;
		}
	}
}

// el saque de banda pasa al rival (toBlue = true si pasa a azul)
function switchThrow(toBlue) {
	game.rsTimer = 0;
	game.warningCount++;
	game.outStatus = toBlue ? "blueThrow" : "redThrow";
	room.setDiscProperties(3, { x: 0, y: 2000, radius: 0 });
	const expected = game.outStatus;
	later(100, () => {
		if (game.outStatus !== expected) return;
		room.setDiscProperties(0, { xspeed: 0, yspeed: 0, color: toBlue ? BALL_BLUE : BALL_RED, x: game.ballOutPositionX, y: game.throwInPosY });
	});
}

function endByTime() {
	if (!game || game.finished) return;
	announce("📢 FIN DEL PARTIDO.", null, null, null, 1);
	finishMatch(room.getScores(), true);
}

// Detección única y EXCLUSIVA de balón fuera (línea de fondo tiene prioridad sobre banda)
function detectOutOfBounds() {
	const b = room.getBallPosition();
	const r = game.ballRadius || 9;
	const goalLineOut = 1150 + r + 3;
	const touchOut = 600 + r + 3;
	if (Math.abs(b.x) > goalLineOut && Math.abs(b.y) > 124) { onGoalLineOut(b); return; }
	if (Math.abs(b.y) > touchOut) onTouchLineOut(b);
}

function checkEndOnDeadBall() {
	if (game.lastPlayAnnounced) { game.lastPlayAnnounced = false; endByTime(); }
}

function onTouchLineOut(b) {
	game.rsActive = false;
	checkEndOnDeadBall();
	if (game.finished) return;
	room.setDiscProperties(0, { xgravity: 0, ygravity: 0 });
	game.ballOutPositionX = clamp(Math.round(b.x * 10) / 10, -1130, 1130);
	game.throwInPosY = b.y > 0 ? 618 : -618;
	const toBlue = game.rsTouchTeam === 1;
	room.setDiscProperties(3, { x: game.ballOutPositionX, y: game.throwInPosY, radius: 18 });
	later(100, () => {
		game.outStatus = toBlue ? "blueThrow" : "redThrow";
		game.throwinKicked = false;
		game.rsTimer = 0;
		game.rsReady = true;
		room.setDiscProperties(0, { xspeed: 0, yspeed: 0, x: game.ballOutPositionX, y: game.throwInPosY, xgravity: 0, ygravity: 0, color: toBlue ? BALL_BLUE : BALL_RED });
	});
	later(150, () => room.setDiscProperties(3, { x: 0, y: 2000, radius: 0 }));
}

function onGoalLineOut(b) {
	game.rsActive = false;
	checkEndOnDeadBall();
	if (game.finished) return;
	room.setDiscProperties(0, { xgravity: 0, ygravity: 0 });
	game.freeze = true;
	enforcePhysics(true);
	const side = b.x > 0 ? 1 : -1;               // +1 = arco derecho (azul defiende), -1 = izquierdo (rojo defiende)
	const defTeam = side > 0 ? 2 : 1;
	if (game.rsTouchTeam === defTeam) startCorner(side, b.y < 0 ? -1 : 1);
	else startGoalKick(side);
}

function startCorner(side, ySign) {
	const attacker = side > 0 ? 1 : 2;
	const x = 1140 * side, y = 590 * ySign;
	const color = attacker === 1 ? BALL_RED : BALL_BLUE;
	const barrier = attacker === 1 ? 2 : 1;      // disco 2 frena al azul, disco 1 frena al rojo
	game.rsSwingTimer = 0;
	if (REF.announceCorners) announce("🚩 Córner " + (attacker === 1 ? "🔴" : "🔵") + " · el rival no puede entrar a la zona", null, attacker === 1 ? COLOR.red : COLOR.blue, "small");
	room.setDiscProperties(3, { x: x, y: y, radius: 18 });
	later(100, () => {
		game.rsCorner = true;
		game.outStatus = attacker === 1 ? "redCK" : "blueCK";
		game.rsTimer = 0;
		game.rsReady = true;
		game.boosterCount = 0;
		game.boosterState = false;
		room.setDiscProperties(0, { x: x, y: y, xspeed: 0, yspeed: 0, color: color, cMask: 268435519, xgravity: 0, ygravity: 0 });
		room.setDiscProperties(barrier, { x: 1150 * side, y: 670 * ySign, radius: REF.ckBarrierRadius });
		room.setDiscProperties(3, { x: 0, y: 2000, radius: 0 });
	});
}

function startGoalKick(side) {
	const defTeam = side > 0 ? 2 : 1;
	game.rsSwingTimer = 0;
	room.setDiscProperties(3, { x: 1060 * side, y: 0, radius: 18 });
	later(100, () => {
		game.outStatus = defTeam === 2 ? "blueGK" : "redGK";
		game.rsTimer = 0;
		game.rsReady = true;
		game.rsGoalKick = true;
		game.rsSwingTimer = 0;
		game.boosterCount = 0;
		game.boosterState = false;
		room.setDiscProperties(0, { xspeed: 0, yspeed: 0, x: 1060 * side, y: 0, color: defTeam === 2 ? BALL_BLUE : BALL_RED, cMask: 268435519, xgravity: 0, ygravity: 0 });
	});
	later(3000, () => room.setDiscProperties(3, { x: 0, y: 2000, radius: 0 }));
}

// Saque de banda inválido: demasiado lejos, empujado hacia dentro, o válido
function checkThrowIn() {
	if (game.rsActive || (game.outStatus !== "redThrow" && game.outStatus !== "blueThrow")) return;
	const b = room.getBallPosition();
	const fromRed = game.outStatus === "redThrow";
	if ((b.y > 612 || b.y < -612) && (b.x < game.ballOutPositionX - REF.throwinDistance || b.x > game.ballOutPositionX + REF.throwinDistance) && !game.bringThrowBack) {
		game.bringThrowBack = true;
		switchThrow(fromRed);
	}
	if (b.y < 612 && b.y > -612 && !game.throwinKicked && !game.pushedOut) { // el balón entró sin ser sacado
		switchThrow(fromRed);
		game.pushedOut = true;
	}
	if (b.y < 612 && b.y > -612 && game.throwinKicked) { // saque correcto
		game.outStatus = "";
		game.rsActive = true;
		game.rsReady = false;
		room.setDiscProperties(0, { color: BALL_WHITE });
		game.rsTimer = 1000000;
		game.warningCount++;
	}
	if (b.y.toFixed(1) === game.throwInPosY.toFixed(1) && b.x.toFixed(1) === game.ballOutPositionX.toFixed(1)) {
		game.bringThrowBack = false;
		game.pushedOut = false;
	}
}

// ---------- Bloqueos de rival (banda / arco) ----------
function blockThrowIn() {
	const out = game.outStatus;
	if (out !== "redThrow" && out !== "blueThrow") return;
	const b = room.getBallPosition();
	if (b.y === 0) return;
	const top = b.y < 0;
	const throwTeam = out === "redThrow" ? 1 : 2, blockTeam = throwTeam === 1 ? 2 : 1;
	teamPlayersInGame().forEach(p => {
		const d = room.getPlayerDiscProperties(p.id);
		if (!d) return;
		if (p.team === blockTeam && (top ? d.y < 0 : d.y > 0)) {
			if (d.cGroup !== 536870918) room.setPlayerDiscProperties(p.id, { cGroup: 536870918 });
			if (p.position && (top ? p.position.y < -485 : p.position.y > 485)) room.setPlayerDiscProperties(p.id, { y: top ? -470 : 470 });
		}
		const own = p.team === 1 ? 2 : 4;
		if (p.team === throwTeam && d.cGroup !== own) room.setPlayerDiscProperties(p.id, { cGroup: own });
	});
	// líneas guía: 17/19 arriba (rojo/azul), 21/23 abajo (rojo/azul)
	const showId = top ? (throwTeam === 1 ? 17 : 19) : (throwTeam === 1 ? 21 : 23);
	const hideId = top ? (throwTeam === 1 ? 19 : 17) : (throwTeam === 1 ? 23 : 21);
	if (room.getDiscProperties(showId).x !== 1149) room.setDiscProperties(showId, { x: 1149 });
	if (room.getDiscProperties(hideId).x !== -1149) room.setDiscProperties(hideId, { x: -1149 });
}

function blockGoalKick() {
	const out = game.outStatus;
	if (out !== "redGK" && out !== "blueGK") return;
	const left = out === "redGK";                 // saque de arco rojo = lado izquierdo
	const gkTeam = left ? 1 : 2, blockTeam = left ? 2 : 1;
	teamPlayersInGame().forEach(p => {
		const d = room.getPlayerDiscProperties(p.id);
		if (!d) return;
		if (p.team === blockTeam && (left ? d.x < 0 : d.x > 0)) {
			if (d.cGroup !== 268435462) room.setPlayerDiscProperties(p.id, { cGroup: 268435462 });
			if (p.position && Math.abs(p.position.y) < 320 && (left ? p.position.x < -840 : p.position.x > 840)) room.setPlayerDiscProperties(p.id, { x: left ? -825 : 825 });
		}
		const own = p.team === 1 ? 2 : 4;
		if (p.team === gkTeam && d.cGroup !== own) room.setPlayerDiscProperties(p.id, { cGroup: own });
	});
}

function removeBlock() {
	if (game.outStatus !== "") return;
	teamPlayersInGame().forEach(p => {
		const d = room.getPlayerDiscProperties(p.id);
		if (!d) return;
		const own = p.team === 1 ? 2 : 4;
		if (d.cGroup !== own) room.setPlayerDiscProperties(p.id, { cGroup: own });
	});
	[17, 19, 21, 23].forEach(id => { if (room.getDiscProperties(id).x !== -1149) room.setDiscProperties(id, { x: -1149 }); });
}

/*============================ AFK / INACTIVIDAD =======================*/
function setAfk(player, value, reason) {
	const i = info(player.id);
	i.afk = value;
	i.warned = false;
	i.lastActivity = Date.now();
	try { room.setPlayerAvatar(player.id, value ? "💤" : null); } catch (e) {}
	if (value) {
		if (player.team !== 0) room.setPlayerTeam(player.id, 0);
		announce("💤 " + player.name + " está AFK" + (reason ? " (" + reason + ")" : "") + ".", null, COLOR.spec, "small");
	} else {
		announce("✅ " + player.name + " volvió del AFK.", null, COLOR.spec, "small");
	}
	scheduleCheck(300);
}

setInterval(function () {
	if (state !== "playing" || !game || game.finished || game.paused) return;
	const now = Date.now();
	teamPlayersInGame().forEach(p => {
		const i = info(p.id);
		const idle = (now - i.lastActivity) / 1000;
		if (idle >= CONFIG.idle.moveSeconds) setAfk(p, true, "inactividad");
		else if (idle >= CONFIG.idle.warnSeconds && !i.warned) {
			i.warned = true;
			whisper("⚠️ ¡Muévete o te enviaré a espectadores!", p.id, COLOR.warn, "bold", 2);
		}
	});
}, 1000);

/*================================ CHAT ================================*/

room.onPlayerChat = function (player, message) {
	const i = info(player.id);
	i.lastActivity = Date.now();
	i.warned = false;
	const text = message.trim();
	if (text.startsWith("!")) {
		if (!/^!(owner|register|registrar|login|entrar|resetpass)\b/i.test(text)) console.log(player.name + ": " + text); // las claves nunca se imprimen
		handleCommand(player, text.slice(1));
		return false;
	}
	console.log(player.name + ": " + text);
	if (draft && /^\d{1,2}$/.test(text) && draft.captains[draft.order[draft.idx]] === player.id) { pickPlayer(player, text); return false; }
	if (i.afk) setAfk(player, false);

	if (text.startsWith("t ")) { // chat de equipo
		const t = player.team, msg = text.slice(2).trim();
		const tag = t === 1 ? "[🔴 Rojo] " : t === 2 ? "[🔵 Azul] " : "[⚪ Spec] ";
		const col = t === 1 ? COLOR.red : t === 2 ? COLOR.blue : COLOR.spec;
		team(t).forEach(tp => room.sendAnnouncement(tag + player.name + ": " + msg, tp.id, col, "normal", 1));
		return false;
	}
	if (text.startsWith("@@")) { // mensaje privado: @@nombre mensaje
		const m = text.slice(2).trim().match(/^(\S+)\s+(.*)$/);
		if (m) {
			const target = findPlayer(m[1]);
			if (!target) whisper("❌ No se encontró al jugador '" + m[1] + "'", player.id, COLOR.pm);
			else {
				whisper("[MD > " + target.name + "] " + player.name + ": " + m[2], player.id, COLOR.pm, "normal", 1);
				whisper("[MD] " + player.name + ": " + m[2], target.id, COLOR.pm, "normal", 1);
			}
		}
		return false;
	}

	const now = Date.now();
	if (i.mutedUntil > now) { whisper("🔇 Estás silenciado (" + Math.ceil((i.mutedUntil - now) / 1000) + " s).", player.id); return false; }
	if (!player.admin) {
		const tooFast = now - i.lastMsgAt < CONFIG.chat.minIntervalMs;
		const repeated = text === i.lastMsg && now - i.lastMsgAt < CONFIG.chat.repeatWindowMs;
		if (tooFast || repeated) {
			i.strikes++;
			if (i.strikes >= CONFIG.chat.muteStrikes) {
				i.mutedUntil = now + CONFIG.chat.muteSeconds * 1000; i.strikes = 0;
				whisper("🔇 Silenciado " + CONFIG.chat.muteSeconds + " s por spam.", player.id, COLOR.warn, "bold");
			} else whisper("⚠️ Más despacio, por favor.", player.id, COLOR.warn);
			return false;
		}
	}
	i.lastMsgAt = now;
	i.lastMsg = text;
	const line = chatLine(player, text);
	room.sendAnnouncement(line.msg, null, line.color, "normal", 1);
	return false;
};

function handleCommand(player, raw) {
	const args = raw.trim().split(/\s+/);
	const cmd = (args.shift() || "").toLowerCase();
	const adminOnly = () => { if (!player.admin) { whisper("❌ Comando de administradores.", player.id); return false; } return true; };
	const ownerOnly = () => { if (!isOwner(player)) { whisper("❌ Solo el dueño puede usar este comando.", player.id); return false; } return true; };

	switch (cmd) {
		case "help": case "ayuda": case "comandos": case "commands":
			whisper("━━━━━ 📋 COMANDOS ━━━━━", player.id, COLOR.brand, "bold");
			whisper("🔐 CUENTA: !register <usuario> <clave> · !login <usuario> <clave> · !logout", player.id, COLOR.ok, "bold");
			whisper("📊 TABLAS: !stats [nombre] · !top [elo|goles|asist|wins] · !rangos", player.id, COLOR.info, "bold");
			whisper("🎮 JUEGO: !afk · !cola · !pick <n|nombre|r> · !discord · !calladmin · !bb · t <msg> (equipo) · @@nombre <msg> (privado)", player.id, COLOR.whisper, "bold");
			if (player.admin) whisper("🛡 ADMIN: !start · !stop · !rr · !swap · !time N · !score N · !teamsize N · !picks on|off · !cancelpicks · !players · !mute #id [min] · !unmute #id · !court HEX|reset", player.id, COLOR.warn, "bold");
			if (isOwner(player)) whisper("👑 DUEÑO: !ip [nombre] · !admin <nombre> · !unadmin <nombre> · !resetpass <usuario> <clave> · !nube · !backup · !setpassword X · !clearpassword · !clearbans", player.id, COLOR.ok, "bold");
			break;
		case "afk":
			setAfk(player, !info(player.id).afk);
			break;
		case "bb":
			room.kickPlayer(player.id, "👋 Hasta la próxima.", false);
			break;
		case "discord":
			whisper(CONFIG.discord.invite ? "✅ Discord: " + CONFIG.discord.invite : "ℹ️ Esta sala aún no tiene Discord configurado.", player.id);
			break;
		case "calladmin": {
			const i = info(player.id);
			if (Date.now() - i.lastCall < 60000) { whisper("⏳ Espera un minuto antes de volver a llamar.", player.id); break; }
			i.lastCall = Date.now();
			whisper("✅ Aviso enviado, pronto llegará un admin.", player.id);
			postWebhook(CONFIG.discord.callAdmin, { content: (CONFIG.discord.adminRoleId ? "<@&" + CONFIG.discord.adminRoleId + "> " : "") + "❗ Se requiere un admin en: " + roomLink });
			break;
		}
		case "miauth":
			whisper("🔑 Tu auth: " + (player.auth || "(no disponible)"), player.id, COLOR.ok);
			whisper("🔑 Tu conn: " + (player.conn || "(no disponible)"), player.id, COLOR.ok);
			break;
		case "owner": { // clave secreta del dueño; si es incorrecta no responde nada (a los 5 fallos se expulsa)
			const oi = info(player.id);
			if (CONFIG.ownerCode && args[0] === CONFIG.ownerCode) {
				oi.ownerFails = 0;
				sessionOwners.add(player.id);
				staffIds.add(player.id);
				room.setPlayerAdmin(player.id, true);
				whisper("👑 Dueño activado. Eres SuperAdmin.", player.id, COLOR.ok, "bold", 2);
				announce("👑 " + player.name + " (dueño) entró con clave.", null, COLOR.ok, "small");
			} else if (CONFIG.ownerCode) {
				oi.ownerFails = (oi.ownerFails || 0) + 1;
				console.log("⚠️ Intento fallido de !owner: " + player.name + " · conn=" + player.conn);
				if (oi.ownerFails >= 5) room.kickPlayer(player.id, "❌ Demasiados intentos.", false);
			}
			break;
		}
		case "ip": case "conn": {
			if (args.length && isOwner(player)) {
				const t = findPlayer(args.join(" "));
				if (!t) { whisper("❌ Jugador no encontrado.", player.id); break; }
				whisper("🌐 " + t.name + " · conn: " + (t.conn || "no disponible") + " · auth: " + (t.auth || "no disponible"), player.id, COLOR.ok, "bold");
				break;
			}
			whisper("🌐 Tu conn (IP): " + (player.conn || "(no disponible)"), player.id, COLOR.ok, "bold");
			break;
		}
		case "pick": case "p":
			pickPlayer(player, args.join(" "));
			break;
		case "cola": case "queue": {
			syncQueue();
			if (!queue.length) { whisper("📭 No hay nadie en la cola.", player.id); break; }
			whisper("🕒 Cola (" + queue.length + "): " + queue.slice(0, 12).map((id, n) => (n + 1) + ". " + nameOf(id)).join("  "), player.id, COLOR.info, "bold");
			break;
		}
		case "stats": case "me": case "perfil": {
			let a = accOf(player);
			if (args.length) {
				const t = findPlayer(args.join(" "));
				a = t ? accOf(t) : accounts[args.join(" ").toLowerCase()];
				if (!a) { whisper("❌ No encontré una cuenta registrada con ese nombre.", player.id); break; }
			} else if (!a) {
				whisper("💾 No estás registrado, así que no se guarda nada. Usa !register <usuario> <clave>", player.id, COLOR.warn, "bold");
				break;
			}
			showStats(a, player.id);
			break;
		}
		case "top": case "ranking":
			showTop(topKind(args[0]), player.id);
			break;
		case "rangos": case "ranks":
			whisper("━━━━━ 🎖 RANGOS (por Elo) ━━━━━", player.id, COLOR.brand, "bold");
			RANKS.forEach((r, n) => {
				const next = RANKS[n + 1];
				const range = n === 0 ? "menos de " + RANKS[1].min + " (puede ser negativo)" : r.min + (next ? " – " + (next.min - 1) : " o más");
				whisper(r.emoji + " " + r.name + " · " + range, player.id, r.color, "bold");
			});
			whisper("ℹ️ Empiezas en " + CONFIG.elo.start + " Elo. Sin !register no se guarda nada.", player.id, COLOR.info);
			break;
		case "register": case "registrar": {
			if (accOf(player)) { whisper("ℹ️ Ya tienes sesión iniciada como " + accOf(player).user + ".", player.id); break; }
			const user = args[0], pass = args[1];
			if (!user || !pass) { whisper("Uso: !register <usuario> <clave>   (ej: !register Dosk mi1234)", player.id, COLOR.warn); break; }
			if (!/^[A-Za-z0-9_\-]{3,15}$/.test(user)) { whisper("❌ Usuario: de 3 a 15 caracteres (letras, números, _ o -), sin espacios.", player.id, COLOR.warn); break; }
			if (pass.length < 4 || pass.length > 30) { whisper("❌ La clave debe tener entre 4 y 30 caracteres.", player.id, COLOR.warn); break; }
			if (cloudOn && !cloudReady) { whisper("⏳ El servidor de cuentas todavía está conectando. Intenta de nuevo en unos segundos.", player.id, COLOR.warn); break; }
			if (accounts[user.toLowerCase()]) { whisper("❌ Ese usuario ya existe. Elige otro.", player.id, COLOR.warn); break; }
			if (findByAuth(player.auth)) { whisper("❌ Este navegador ya tiene una cuenta. Entra con !login <usuario> <clave>.", player.id, COLOR.warn); break; }
			const salt = newSalt();
			accounts[user.toLowerCase()] = { user: user, salt: salt, hash: hashPass(pass, salt), auth: player.auth || null, elo: CONFIG.elo.start, goals: 0, assists: 0, og: 0, games: 0, wins: 0, draws: 0, losses: 0, created: Date.now() };
			sessions[player.id] = user.toLowerCase();
			const pid = player.id;
			saveAccounts(ok => {
				if (cloudOn) whisper(ok ? "☁️ Cuenta guardada en la nube: entrarás con !login " + user + " <clave> desde donde quieras." : "⚠️ No se pudo guardar en la nube (se guardó local). Avisa al dueño.", pid, ok ? COLOR.ok : COLOR.warn, "bold");
			});
			whisper("✅ Cuenta creada: " + user + ". Ya estás dentro y tu progreso se guarda.", player.id, COLOR.ok, "bold", 2);
			whisper("🔐 Para volver a entrar escribe:  !login " + user + " " + pass, player.id, COLOR.ok, "bold");
			whisper("⚠️ No uses una clave que uses en otros sitios. Mira tu perfil con !stats", player.id, COLOR.warn);
			announce("🆕 " + player.name + " se registró (" + RANKS[0].emoji + " " + RANKS[0].name + ")", null, COLOR.spec, "small");
			break;
		}
		case "login": case "entrar": {
			if (accOf(player)) { whisper("ℹ️ Ya tienes sesión iniciada como " + accOf(player).user + ".", player.id); break; }
			const i = info(player.id);
			if (i.loginBlock && i.loginBlock > Date.now()) { whisper("⏳ Demasiados intentos. Espera un momento.", player.id, COLOR.warn); break; }
			if (cloudOn && !cloudReady) { whisper("⏳ El servidor de cuentas todavía está conectando. Intenta de nuevo en unos segundos.", player.id, COLOR.warn); break; }
			const key = (args[0] || "").toLowerCase(), acc = accounts[key];
			if (!acc || !args[1] || acc.hash !== hashPass(args[1], acc.salt)) {
				i.loginFails = (i.loginFails || 0) + 1;
				if (i.loginFails >= 5) { i.loginBlock = Date.now() + 60000; i.loginFails = 0; }
				whisper("❌ Usuario o clave incorrectos. Uso: !login <usuario> <clave>", player.id, COLOR.warn);
				break;
			}
			if (!claimSession(key, player)) { whisper("⚠️ Esa cuenta ya está en uso en la sala.", player.id, COLOR.warn); break; }
			i.loginFails = 0;
			if (player.auth && !accAuths(acc).includes(player.auth)) { acc.auths = (acc.auths || []).concat(player.auth); saveAccounts(); } // este navegador también entrará solo
			else saveAccounts();
			const r = rankOf(acc.elo);
			whisper("✅ Sesión iniciada como " + acc.user + " · " + r.emoji + " " + r.name + " · Elo " + acc.elo, player.id, r.color, "bold", 2);
			break;
		}
		case "logout": case "salir":
			if (!accOf(player)) { whisper("ℹ️ No tienes sesión iniciada.", player.id); break; }
			delete sessions[player.id];
			whisper("👋 Sesión cerrada. Lo que juegues ahora no se guardará.", player.id, COLOR.info);
			break;
		case "nube": case "cloud": {
			if (!ownerOnly()) break;
			if (!cloudOn) { whisper("☁️ Nube DESACTIVADA: pon tu URL de Firebase en CONFIG.cloudDB.", player.id, COLOR.warn, "bold"); break; }
			whisper("☁️ Nube: " + (cloudReady ? "CONECTADA ✅" : "SIN CONECTAR ❌") + " · cuentas: " + Object.keys(accounts).length + (cloudLastOk ? " · último guardado hace " + Math.round((Date.now() - cloudLastOk) / 1000) + " s" : "") + (cloudLastErr ? " · error: " + cloudLastErr : ""), player.id, cloudReady ? COLOR.ok : COLOR.warn, "bold");
			if (cloudReady) cloudPush(ok => whisper(ok ? "☁️ Prueba de guardado: OK" : "☁️ Prueba de guardado: FALLÓ (revisa las Rules de Firebase)", player.id, ok ? COLOR.ok : COLOR.warn));
			break;
		}
		case "backup":
			if (!ownerOnly()) break;
			console.log("BACKUP_CUENTAS=" + JSON.stringify(accounts));
			whisper("💾 Respaldo de " + Object.keys(accounts).length + " cuentas impreso en la consola del host (F12), línea BACKUP_CUENTAS=. Pega lo que va después del = dentro de importAccounts: { ... } en el código.", player.id, COLOR.ok, "bold");
			break;
		case "resetpass": {
			if (!ownerOnly()) break;
			const acc = accounts[(args[0] || "").toLowerCase()];
			if (!acc || !args[1]) { whisper("Uso: !resetpass <usuario> <nueva clave>", player.id); break; }
			acc.salt = newSalt();
			acc.hash = hashPass(args[1], acc.salt);
			saveAccounts();
			whisper("✅ Clave de " + acc.user + " restablecida.", player.id, COLOR.ok);
			break;
		}
		case "admin": {
			if (!ownerOnly()) break;
			const t = findPlayer(args.join(" "));
			if (!t) { whisper("Uso: !admin #id | nombre   (la persona debe estar en la sala)", player.id); break; }
			if (isOwner(t)) { whisper("ℹ️ " + t.name + " ya es el dueño.", player.id); break; }
			staffIds.add(t.id);
			if (t.auth) {
				if (!staffSaved.some(x => x.auth === t.auth)) { staffSaved.push({ auth: t.auth, name: t.name }); saveStaff(); }
			} else whisper("⚠️ " + t.name + " no tiene auth disponible: será admin solo mientras siga en la sala.", player.id, COLOR.warn);
			room.setPlayerAdmin(t.id, true);
			announce("🛡 " + t.name + " ahora es admin (por " + player.name + ").", null, COLOR.warn, "bold", 1);
			whisper("📌 Para dejarlo permanente en el código → por IP: adminConns: [\"" + (t.conn || "") + "\"]  ·  por auth: adminAuths: [\"" + (t.auth || "no disponible") + "\"]", player.id, COLOR.whisper);
			break;
		}
		case "unadmin": {
			if (!ownerOnly()) break;
			const t = findPlayer(args.join(" "));
			if (!t) { whisper("Uso: !unadmin #id | nombre   (la persona debe estar en la sala)", player.id); break; }
			if (isOwner(t)) { whisper("❌ No puedes quitarle el admin al dueño.", player.id); break; }
			staffIds.delete(t.id);
			if (t.auth) { staffSaved = staffSaved.filter(x => x.auth !== t.auth); saveStaff(); }
			room.setPlayerAdmin(t.id, false);
			announce("🛡 " + t.name + " ya no es admin.", null, COLOR.warn);
			if ((t.auth && CONFIG.adminAuths.includes(t.auth)) || (t.conn && CONFIG.adminConns.includes(t.conn))) whisper("⚠️ También está en adminAuths/adminConns del código: bórralo ahí o volverá a ser admin al entrar.", player.id, COLOR.warn);
			break;
		}
		case "start":
			if (!adminOnly()) break;
			autoHold = false;
			if (room.getScores() === null) { syncQueue(); if (team(1).length && team(2).length) { balanceTeams(); startMatch(); } else scheduleCheck(0); }
			break;
		case "stop":
			if (!adminOnly()) break;
			if (room.getScores() !== null) room.stopGame();
			break;
		case "rr":
			if (!adminOnly()) break;
			autoHold = false;
			pendingResult = null;
			if (room.getScores() !== null) { ignoreStops++; room.stopGame(); }
			game = null;
			startMatch();
			break;
		case "swap":
			if (!adminOnly()) break;
			room.getPlayerList().forEach(p => { if (p.team === 1) room.setPlayerTeam(p.id, 2); else if (p.team === 2) room.setPlayerTeam(p.id, 1); });
			incumbent = incumbent === 1 ? 2 : incumbent === 2 ? 1 : 0;
			announce("🔄 Los equipos fueron cambiados de lado.");
			break;
		case "time": {
			if (!adminOnly()) break;
			const n = parseInt(args[0], 10);
			if (!(n >= 1 && n <= 30)) { whisper("Uso: !time <1-30> (minutos)", player.id); break; }
			CONFIG.gameMinutes = n;
			announce("⏱ Duración del partido: " + n + " min (desde el próximo partido) · por " + player.name);
			break;
		}
		case "score": {
			if (!adminOnly()) break;
			const n = parseInt(args[0], 10);
			if (!(n >= 1 && n <= 15)) { whisper("Uso: !score <1-15> (goles)", player.id); break; }
			CONFIG.scoreLimit = n;
			if (room.getScores() === null) room.setScoreLimit(n);
			announce("🥅 Límite de goles: " + n + " (desde el próximo partido) · por " + player.name);
			break;
		}
		case "teamsize": {
			if (!adminOnly()) break;
			const n = parseInt(args[0], 10);
			if (!(n >= 1 && n <= 6)) { whisper("Uso: !teamsize <1-6>", player.id); break; }
			CONFIG.teamSize = n;
			announce("👥 Tamaño máximo por equipo: " + n + "v" + n + " · por " + player.name);
			scheduleCheck(300);
			break;
		}
		case "picks":
			if (!adminOnly()) break;
			CONFIG.picks.enabled = (args[0] || "").toLowerCase() !== "off";
			announce("🎯 Sistema de picks " + (CONFIG.picks.enabled ? "ACTIVADO" : "DESACTIVADO") + " por " + player.name);
			break;
		case "cancelpicks":
			if (!adminOnly()) break;
			if (draft) abortDraft("cancelado por " + player.name); else whisper("ℹ️ No hay picks en curso.", player.id);
			break;
		case "players":
			if (!adminOnly()) break;
			whisper("👥 " + room.getPlayerList().map(p => "#" + p.id + " " + p.name + (info(p.id).afk ? " 💤" : "")).join(" · "), player.id);
			break;
		case "mute": case "unmute": {
			if (!adminOnly()) break;
			const t = findPlayer(args[0]);
			if (!t) { whisper("Uso: !" + cmd + " #id|nombre [minutos]", player.id); break; }
			if (cmd === "mute") {
				const mins = clamp(parseInt(args[1], 10) || 5, 1, 120);
				info(t.id).mutedUntil = Date.now() + mins * 60000;
				announce("🔇 " + t.name + " fue silenciado " + mins + " min por " + player.name);
			} else {
				info(t.id).mutedUntil = 0;
				announce("🔊 " + t.name + " ya puede hablar.");
			}
			break;
		}
		case "court": case "cancha":
			if (args.length === 0) { whisper("❗ Color de fondo actual: " + CONFIG.mapBGColor, player.id); break; }
			if (!adminOnly()) break;
			if (room.getScores() !== null) { whisper("❌ No se puede cambiar el color mientras se juega.", player.id); break; }
			if (currentMap !== "rsr") { whisper("❌ El color solo aplica al mapa RSR (ahora está el Classic).", player.id); break; }
			if (args[0] === "reset") CONFIG.mapBGColor = "86A578";
			else if (/^[0-9a-fA-F]{6}$/.test(args[0])) CONFIG.mapBGColor = args[0];
			else { whisper("Uso: !court <hex de 6 dígitos> | reset", player.id); break; }
			room.setCustomStadium(getRSRMap());
			announce("📢 Color del campo: " + CONFIG.mapBGColor + " (por " + player.name + ").");
			break;
		case "setpassword":
			if (!ownerOnly() || !args[0]) break;
			room.setPassword(args[0]);
			announce("📢 La contraseña fue cambiada por " + player.name + ".");
			break;
		case "clearpassword":
			if (!ownerOnly()) break;
			room.setPassword(null);
			announce("📢 La contraseña fue borrada por " + player.name + ".");
			break;
		case "clearbans":
			if (!ownerOnly()) break;
			room.clearBans();
			announce("📢 Los bans fueron eliminados por " + player.name + ".");
			break;
		default:
			whisper("❓ Comando desconocido. Escribe !help", player.id);
	}
}

if (!CONFIG.ownerAuths.length && !CONFIG.ownerConns.length && !CONFIG.ownerCode) console.warn("⚠️ No hay dueño configurado: nadie será admin.");
console.log("✅ " + CONFIG.stadiumName + " listo · " + CONFIG.teamSize + "v" + CONFIG.teamSize);
cloudLoad(); // ☁️ al final: descarga las cuentas de la nube
