import pathlib
r=pathlib.Path(__file__).parent; s=r/'src'
out=(s/'head.html').read_text()+(s/'body.html').read_text()+'<script>\n'+(s/'engine.js').read_text()+'\n'+(s/'app.js').read_text()+'\n</script>\n'
(r/'dist').mkdir(exist_ok=True); (r/'dist'/'index.html').write_text(out); print(len(out))
