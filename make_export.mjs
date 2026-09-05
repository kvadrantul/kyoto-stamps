// Собирает kyoto-stamps.kml и kyoto-stamps.gpx из точек в index.html.
// Запуск: node make_export.mjs
import {readFileSync, writeFileSync} from "node:fs";

const html = readFileSync("index.html", "utf8");
const body = html.split("const P = [")[1].split("\n];")[0];
const AREA = {east:"Хигасияма", center:"Центр", north:"Север", west:"Запад", south:"Юг", far:"Дальние"};
const P = eval("[" + body + "]");

const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const kind = p => p.type === "free" ? "Памятный штамп — ставите сами, бесплатно. Годится любой блокнот."
  : (p.paper === "sheet" ? "Печатный лист — дают готовым, кистью при вас не пишут. " + p.fee
                         : "Госюин — пишут кистью при вас, только в госюинтё. " + p.fee);
const desc = p => [
  kind(p),
  p.type === "both" ? "Здесь же стоит бесплатный памятный штамп — ставите сами." : "",
  "Часы: " + p.hours,
  "Вход: " + p.entry,
  "Куда идти: " + p.where,
  "Условия: " + p.how,
  p.note ? "Заметка: " + p.note : "",
  "Район: " + AREA[p.area]
].filter(Boolean).join("\n");

const groups = [
  ["Госюин — пишут кистью при вас, 300–500 ¥", p => p.type !== "free", "https://maps.google.com/mapfiles/kml/paddle/red-circle.png"],
  ["Памятные штампы — ставите сами, бесплатно", p => p.type === "free", "https://maps.google.com/mapfiles/kml/paddle/blu-square.png"]
];

let kml = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document>\n';
kml += "<name>Печати Киото — госюин и бесплатные штампы</name>\n";
kml += "<description>" + esc("Два разных вида печатей. Госюин: пишут кистью при вас, только в блокнот-госюинтё, 300–500 ¥. Памятный штамп: резиновый штемпель на вокзале или в музее, ставите сами и бесплатно. Сведения собраны 5 сентября 2026 года.") + "</description>\n";
groups.forEach(([name, pick, icon], gi) => {
  kml += '<Style id="s' + gi + '"><IconStyle><Icon><href>' + icon + "</href></Icon></IconStyle></Style>\n";
  kml += "<Folder><name>" + esc(name) + "</name>\n";
  for (const p of P.filter(pick)){
    kml += "<Placemark><name>" + esc(p.n + " · " + p.jp) + "</name>" +
      "<description>" + esc(desc(p)) + "</description>" +
      "<styleUrl>#s" + gi + "</styleUrl>" +
      "<Point><coordinates>" + p.lon + "," + p.lat + ",0</coordinates></Point></Placemark>\n";
  }
  kml += "</Folder>\n";
});
kml += "</Document></kml>\n";
writeFileSync("kyoto-stamps.kml", kml);

let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="kyoto-stamps" xmlns="http://www.topografix.com/GPX/1/1">\n';
gpx += "<metadata><name>Печати Киото</name></metadata>\n";
for (const p of P){
  gpx += '<wpt lat="' + p.lat + '" lon="' + p.lon + '"><name>' + esc(p.n) + "</name>" +
    "<desc>" + esc(desc(p)) + "</desc>" +
    "<type>" + (p.type === "free" ? "штамп — ставите сами" : "госюин — пишут при вас") + "</type></wpt>\n";
}
gpx += "</gpx>\n";
writeFileSync("kyoto-stamps.gpx", gpx);
console.log("точек:", P.length, "· бесплатных:", P.filter(p => p.type === "free" || p.type === "both").length);
