/* Gerador mínimo de planilha do Excel (.xlsx), sem biblioteca externa.
   Monta o arquivo direto no navegador: um .xlsx é um .zip com alguns XML dentro.
   Uso: MiniXLSX.build([{name, cols:[larguras], rows:[[células]], freezeRow, filter:'A4:I20', landscape}]) -> Uint8Array
   Célula: valor simples (texto ou número) ou {v, s:'estilo', f:'fórmula'}. Textos nunca viram fórmula. */
(function(){
'use strict';

/* estilos disponíveis (nome -> posição em cellXfs, na mesma ordem de STYLES_XML) */
const ST = {title:1, muted:2, head:3, text:4, date:5, money:6, int:7, pct:8, pago:9, atrasado:10, pendente:11, isento:12,
  label:13, totalLabel:14, totalInt:15, totalMoney:16, bigPct:17, section:18, center:19};

const STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
'<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="&quot;R$&quot;\\ #,##0.00"/></numFmts>'+
'<fonts count="10">'+
  '<font><sz val="11"/><color rgb="FF1A1A1A"/><name val="Calibri"/><family val="2"/></font>'+
  '<font><b/><sz val="11"/><color rgb="FF1A1A1A"/><name val="Calibri"/><family val="2"/></font>'+
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>'+
  '<font><b/><sz val="16"/><color rgb="FF0A2952"/><name val="Calibri"/><family val="2"/></font>'+
  '<font><i/><sz val="10"/><color rgb="FF6B6B6B"/><name val="Calibri"/><family val="2"/></font>'+
  '<font><b/><sz val="11"/><color rgb="FF1E6B34"/><name val="Calibri"/><family val="2"/></font>'+
  '<font><b/><sz val="11"/><color rgb="FF9B1C1C"/><name val="Calibri"/><family val="2"/></font>'+
  '<font><b/><sz val="11"/><color rgb="FF7A5600"/><name val="Calibri"/><family val="2"/></font>'+
  '<font><b/><sz val="11"/><color rgb="FF555555"/><name val="Calibri"/><family val="2"/></font>'+
  '<font><b/><sz val="13"/><color rgb="FF0A2952"/><name val="Calibri"/><family val="2"/></font>'+
'</fonts>'+
'<fills count="8">'+
  '<fill><patternFill patternType="none"/></fill>'+
  '<fill><patternFill patternType="gray125"/></fill>'+
  '<fill><patternFill patternType="solid"><fgColor rgb="FF0A2952"/><bgColor indexed="64"/></patternFill></fill>'+
  '<fill><patternFill patternType="solid"><fgColor rgb="FFDDF2E0"/><bgColor indexed="64"/></patternFill></fill>'+
  '<fill><patternFill patternType="solid"><fgColor rgb="FFFADADA"/><bgColor indexed="64"/></patternFill></fill>'+
  '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF1C2"/><bgColor indexed="64"/></patternFill></fill>'+
  '<fill><patternFill patternType="solid"><fgColor rgb="FFEAEAEA"/><bgColor indexed="64"/></patternFill></fill>'+
  '<fill><patternFill patternType="solid"><fgColor rgb="FFF2EDE4"/><bgColor indexed="64"/></patternFill></fill>'+
'</fills>'+
'<borders count="3">'+
  '<border><left/><right/><top/><bottom/><diagonal/></border>'+
  '<border><left style="thin"><color rgb="FFD0D0D0"/></left><right style="thin"><color rgb="FFD0D0D0"/></right><top style="thin"><color rgb="FFD0D0D0"/></top><bottom style="thin"><color rgb="FFD0D0D0"/></bottom><diagonal/></border>'+
  '<border><left style="thin"><color rgb="FFD0D0D0"/></left><right style="thin"><color rgb="FFD0D0D0"/></right><top style="medium"><color rgb="FF0A2952"/></top><bottom style="thin"><color rgb="FFD0D0D0"/></bottom><diagonal/></border>'+
'</borders>'+
'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
'<cellXfs count="20">'+
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'+                                                                                                       /* 0 padrão */
  '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>'+                                                                                          /* 1 title */
  '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>'+                                                                                          /* 2 muted */
  '<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'+ /* 3 head */
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>'+                                       /* 4 text */
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'+ /* 5 date */
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>'+            /* 6 money */
  '<xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'+ /* 7 int */
  '<xf numFmtId="9" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'+ /* 8 pct */
  '<xf numFmtId="0" fontId="5" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'+ /* 9 pago */
  '<xf numFmtId="0" fontId="6" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'+ /* 10 atrasado */
  '<xf numFmtId="0" fontId="7" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'+ /* 11 pendente */
  '<xf numFmtId="0" fontId="8" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'+ /* 12 isento */
  '<xf numFmtId="0" fontId="1" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>'+            /* 13 label */
  '<xf numFmtId="0" fontId="1" fillId="7" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>'+            /* 14 totalLabel */
  '<xf numFmtId="1" fontId="1" fillId="7" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'+ /* 15 totalInt */
  '<xf numFmtId="165" fontId="1" fillId="7" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>'+ /* 16 totalMoney */
  '<xf numFmtId="9" fontId="1" fillId="7" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'+ /* 17 bigPct */
  '<xf numFmtId="0" fontId="9" fillId="0" borderId="0" xfId="0" applyFont="1"/>'+                                                                                          /* 18 section */
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'+                  /* 19 center */
'</cellXfs>'+
'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'+
'</styleSheet>';

const enc = new TextEncoder();
const bytes = s => enc.encode(s);
const esc = s => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const colName = i => { let n = i + 1, s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
/* data ISO (aaaa-mm-dd) -> número de série do Excel */
const serial = iso => Math.round((Date.UTC(+iso.slice(0,4), +iso.slice(5,7)-1, +iso.slice(8,10)) - Date.UTC(1899, 11, 30)) / 86400000);

function cellXML(c, ref){
  if (c == null) return '';
  if (typeof c !== 'object') c = {v:c};
  const s = c.s ? ' s="'+ST[c.s]+'"' : '';
  if (c.f != null) return '<c r="'+ref+'"'+s+'><f>'+esc(c.f)+'</f><v>'+(+c.v || 0)+'</v></c>';
  if (c.v == null || c.v === '') return s ? '<c r="'+ref+'"'+s+'/>' : '';
  if (typeof c.v === 'number' && isFinite(c.v)) return '<c r="'+ref+'"'+s+'><v>'+c.v+'</v></c>';
  return '<c r="'+ref+'"'+s+' t="inlineStr"><is><t xml:space="preserve">'+esc(c.v)+'</t></is></c>';
}

function sheetXML(sh){
  const rows = sh.rows || [];
  let maxC = 1;
  rows.forEach(r => { if (r && r.length > maxC) maxC = r.length; });
  const head = sh.headRow || 0;
  const data = rows.map((r, i) => {
    const cells = (r || []).map((c, j) => cellXML(c, colName(j)+(i+1))).join('');
    const ht = (i+1) === head ? ' ht="32" customHeight="1"' : (i === 0 ? ' ht="26" customHeight="1"' : '');
    return '<row r="'+(i+1)+'"'+ht+'>'+cells+'</row>';
  }).join('');
  const cols = (sh.cols || []).map((w, i) => '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('');
  const pane = sh.freezeRow ? '<pane ySplit="'+sh.freezeRow+'" topLeftCell="A'+(sh.freezeRow+1)+'" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A'+(sh.freezeRow+1)+'" sqref="A'+(sh.freezeRow+1)+'"/>' : '';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'+
    '<dimension ref="A1:'+colName(maxC-1)+Math.max(rows.length, 1)+'"/>'+
    '<sheetViews><sheetView workbookViewId="0"'+(sh.hideGrid ? ' showGridLines="0"' : '')+(sh.selected ? ' tabSelected="1"' : '')+'>'+pane+'</sheetView></sheetViews>'+
    '<sheetFormatPr defaultRowHeight="18"/>'+
    (cols ? '<cols>'+cols+'</cols>' : '')+
    '<sheetData>'+data+'</sheetData>'+
    (sh.filter ? '<autoFilter ref="'+sh.filter+'"/>' : '')+
    '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>'+
    '<pageSetup paperSize="9" orientation="'+(sh.landscape ? 'landscape' : 'portrait')+'" fitToWidth="1" fitToHeight="0"/>'+
    '</worksheet>';
}

/* zip sem compressão ("store"): suficiente e simples */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };

function zip(files){
  const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const out = [], central = [];
  let offset = 0;
  files.forEach(f => {
    const name = bytes(f.name), crc = crc32(f.data), size = f.data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, size, true); lh.setUint32(22, size, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    out.push(new Uint8Array(lh.buffer), name, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, size, true); ch.setUint32(24, size, true); ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + size;
  });
  const cdSize = central.reduce((a, p) => a + p.length, 0);
  const eo = new DataView(new ArrayBuffer(22));
  eo.setUint32(0, 0x06054b50, true); eo.setUint16(8, files.length, true); eo.setUint16(10, files.length, true);
  eo.setUint32(12, cdSize, true); eo.setUint32(16, offset, true);
  const parts = out.concat(central, [new Uint8Array(eo.buffer)]);
  const res = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let pos = 0;
  parts.forEach(p => { res.set(p, pos); pos += p.length; });
  return res;
}

/* nomes de aba: até 31 caracteres, sem  \ / ? * [ ] : */
const sheetName = n => String(n).replace(/[\\\/?*\[\]:]/g, ' ').slice(0, 31) || 'Planilha';

function build(sheets){
  sheets = sheets.map((s, i) => Object.assign({}, s, {name: sheetName(s.name), selected: i === 0}));
  const NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const files = [
    {name:'[Content_Types].xml', data: bytes('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
      '<Default Extension="xml" ContentType="application/xml"/>'+
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
      sheets.map((s, i) => '<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
      '</Types>')},
    {name:'_rels/.rels', data: bytes('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="'+NS+'/officeDocument" Target="xl/workbook.xml"/></Relationships>')},
    {name:'xl/workbook.xml', data: bytes('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="'+NS+'">'+
      '<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000" activeTab="0"/></bookViews>'+
      '<sheets>'+sheets.map((s, i) => '<sheet name="'+esc(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets>'+
      '<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>')},
    {name:'xl/_rels/workbook.xml.rels', data: bytes('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      sheets.map((s, i) => '<Relationship Id="rId'+(i+1)+'" Type="'+NS+'/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+
      '<Relationship Id="rId'+(sheets.length+1)+'" Type="'+NS+'/styles" Target="styles.xml"/></Relationships>')},
    {name:'xl/styles.xml', data: bytes(STYLES_XML)}
  ].concat(sheets.map((s, i) => ({name:'xl/worksheets/sheet'+(i+1)+'.xml', data: bytes(sheetXML(s))})));
  return zip(files);
}

window.MiniXLSX = {
  build: build,
  serial: serial,
  mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};
})();
