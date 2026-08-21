import re
file_path = r"f:\FREELANCE\NZ-Solutions\keyur-hirelense-final\ca-saas-platform\modules\Hirelens\hirelense\frontend\src\apps\employer-portal\src\EmployerPortal.jsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

def replacer(match):
    return '''                  <tbody>
                    {filteredCandidates.map((c, idx) => {
                      const ini = c.name ? c.name.split(" ").map(x => x[0]).join("") : "??";
                      let totalScore = 100;
                      try {
                        if (c.meta_info) {
                          const meta = typeof c.meta_info === 'string' ? JSON.parse(c.meta_info) : c.meta_info;
                          if (meta.total_score) totalScore = meta.total_score;
                        }
                      } catch(e) {}
                      const pct = c.score !== null ? (c.score / totalScore) * 100 : 0;
                      const scoreClass = c.score === null ? "" : pct >= 71 ? "s-hi" : pct >= 51 ? "s-mid" : "s-lo";
                      return (
                        <tr key={idx}>
                          <td>
                            <span className="r-item" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                              <span className="mini-av">{ini}</span>
                              <span className="grow">
                                <b>{c.name}</b>
                                <small>{c.email}</small>
                              </span>
                            </span>
                          </td>
                          <td>
                            {c.score !== null ? <span className={scorechip \}>{${c.score}/}</span> : <span className="okcell">—</span>}'''

new_content = re.sub(
    r'                  <tbody>\s*\{filteredCandidates\.map\(\(c, idx\) => \{\s*const ini = c\.name \? c\.name\.split\(" "\)\.map\(x => x\[0\]\)\.join\(""\) : "\?\?";\s*const scoreClass = c\.score === null \? "" : c\.score >= 71 \? "s-hi" : c\.score >= 51 \? "s-mid" : "s-lo";\s*return \(\s*<tr key=\{idx\}>\s*<td>\s*<span className="r-item" style=\{\{ padding: 0, border: \'none\', background: \'transparent\' \}\}>\s*<span className="mini-av">\{ini\}</span>\s*<span className="grow">\s*<b>\{c\.name\}</b>\s*<small>\{c\.email\}</small>\s*</span>\s*</span>\s*</td>\s*<td>\s*\{c\.score !== null \? <span className=\{\scorechip \$\{scoreClass\}\\}>\{c\.score\}</span> : <span className="okcell">—</span>\}',
    replacer,
    content,
    flags=re.DOTALL
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Pipeline patched successfully!")
