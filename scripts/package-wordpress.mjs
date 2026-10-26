import './build-wordpress.mjs';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const out=process.argv[2];if(!out)throw Error('Provide an absolute output .zip path');
fs.copyFileSync('wordpress/README.md','wordpress/bb3d-card-studio/README.md');
execFileSync('python3',['-c',`
import pathlib,sys,zipfile
root=pathlib.Path('wordpress/bb3d-card-studio')
out=pathlib.Path(sys.argv[1]);out.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(root.rglob('*')):
        if p.is_file(): z.write(p,p.relative_to(root.parent).as_posix())
with zipfile.ZipFile(out) as z:
    assert z.testzip() is None
    assert 'bb3d-card-studio/bb3d-card-studio.php' in z.namelist()
    assert 'bb3d-card-studio/catalogue.json' in z.namelist()
    assert not any('/tests/' in p or p.endswith('.env') or 'wp-config' in p for p in z.namelist())
print(str(out)+' ('+str(out.stat().st_size)+' bytes)')
`,out],{stdio:'inherit'});
