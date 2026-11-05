# Makes the upload copy of the app: same code, minus the internal notes (comments), so the file is smaller.
import re,sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src).read()
s=re.sub(r'<!--(?!\[if)[\s\S]*?-->','',s)                       # HTML comments
def css(m): return re.sub(r'/\*[\s\S]*?\*/','',m.group(0))
s=re.sub(r'<style[^>]*>[\s\S]*?</style>',css,s)                  # CSS comments
out=[];
for line in s.split('\n'):
    if re.match(r'^\s*//',line): continue                         # full-line JS comments
    out.append(line.rstrip())
s='\n'.join(out)
s=re.sub(r'\n{3,}','\n\n',s)
open(dst,'w').write(s)
print(f'{len(open(src).read())/1e6:.2f} MB -> {len(s)/1e6:.2f} MB')
