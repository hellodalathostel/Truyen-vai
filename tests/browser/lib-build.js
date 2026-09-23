const S = await import("/src/store.js");
const Src = await (await fetch("/src/app.js")).text();
const mv = /PHIEN_BAN_TRUYEN\s*=\s*(\d+)/.exec(Src);
await S.loadStories();
const all = { type: "truyen-vai-all", version: mv ? Number(mv[1]) : 5, stories: [], messages: {}, anh: {} };
for (const s of S.store.stories) {
  all.stories.push(s);
  for (const c of s.hoiThoais) all.messages[c.id] = (await root.kv.tinNhan.get(c.id)) || [];
  for (const a of s.anh || []) { const rec = await root.kv.thuVienAnh.get(a.id); if (rec) all.anh[a.id] = rec; }
}
return JSON.stringify(all);
