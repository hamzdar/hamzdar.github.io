const ctx = document.querySelector('canvas').getContext('2d');
ctx.scale(2, 2);
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.lineWidth = 4;
ctx.strokeStyle = '#192451';

function shape(path, fill) {
  const outline = new Path2D(path);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill(outline);
  }
  ctx.stroke(outline);
}

function oval(x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

const ink = '#192451';
const blue = '#a7b4f2';
const orange = '#ffc554';

oval(302, 322, 234, 22, '#cbd3f7');

// The drafting table and its oversized drawing.
shape('M84 243 L464 243 L464 261 L84 261 Z', ink);
shape('M112 261 L132 261 L108 325 L93 325 Z', blue);
shape('M416 261 L435 261 L455 325 L439 325 Z', blue);
shape('M278 241 L301 128 L509 134 L471 241 Z', '#344fbd');
ctx.strokeStyle = '#dce4ff';
ctx.lineWidth = 2;
shape('M340 219 L353 174 Q337 150 373 147 L430 148 Q460 154 438 177 L425 219 Z');
shape('M350 212 L360 174 Q348 155 378 154 L425 155 Q449 158 430 176 L420 212 Z');
shape('M376 212 L383 188 L405 188 L398 212 M366 176 L375 176 M390 176 L399 176 M415 176 L423 176');
shape('M323 229 L443 229 M325 233 L328 225 M439 233 L442 225 M471 147 L448 222 M465 147 L478 147 M443 222 L453 222');
ctx.strokeStyle = ink;
ctx.lineWidth = 4;

// The architect, briefly distracted.
shape('M147 217 L102 206 L120 182 L164 194 Z', '#7987c6');
shape('M176 226 L171 241 L153 241 M200 228 L203 241 L219 241');
shape('M135 192 Q144 163 181 152 Q193 144 191 115 Q196 73 236 88 Q258 96 257 125 Q256 148 240 163 Q242 217 208 229 Q154 246 135 210 Z', blue);
shape('M146 195 Q182 187 215 178 Q205 212 172 221 Q148 217 146 195 Z', '#7987c6');
shape('M251 117 L279 126 L251 134 Z', orange);
oval(239, 111, 4.5, 5.5, ink);
shape('M186 101 Q184 69 214 64 Q241 62 252 90 L268 93 L266 103 L185 112 Q177 109 186 101 Z', orange);
shape('M208 67 Q201 78 202 95 M231 68 Q241 78 243 91 M186 101 L252 90');
shape('M73 165 L73 181 M65 173 L81 173 M504 91 L504 111 M494 101 L514 101');
