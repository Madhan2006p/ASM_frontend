const fs = require('fs');

const path = '/home/madhan/Desktop/ASM-New/frontend/src/components/MobileVAPT/MobileVAPT.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update handleRowClick
const oldHandleClick = `  // Click row -> Open Detail
  const handleRowClick = async (scan) => {
    setSelectedScan(scan);
    setLoadingDetail(true);
    setScanDetail(null);
    setActiveTab('Overview');`;

const newHandleClick = `  // Click row -> Open Detail
  const handleRowClick = async (scan) => {
    if (selectedScan && selectedScan.id === scan.id) {
      setSelectedScan(null);
      setScanDetail(null);
      return;
    }
    setSelectedScan(scan);
    setLoadingDetail(true);
    setScanDetail(null);
    setActiveTab('Overview');`;

content = content.replace(oldHandleClick, newHandleClick);

// 2. Extract Sections
const topGridStart = content.indexOf('{/* Top Split Layout */}');
const bottomPanelStart = content.indexOf('{/* Bottom Panel: Recent Audits */}');
const detailModalStart = content.indexOf('{/* Detail Modal */}');

if (topGridStart === -1 || bottomPanelStart === -1 || detailModalStart === -1) {
    console.log("Could not find sections");
    process.exit(1);
}

const topGrid = content.substring(topGridStart, bottomPanelStart);
let bottomPanel = content.substring(bottomPanelStart, detailModalStart);
const modalHtml = content.substring(detailModalStart);

// Extract Modal Body Content
const modalBodyStart = modalHtml.indexOf('{loadingDetail ? (');
const modalBodyEndStr = '              )}';
const endOfModalIndex = modalHtml.lastIndexOf(modalBodyEndStr);
// We want to capture up to the end of the error loading details block
const modalInner = modalHtml.substring(modalBodyStart, endOfModalIndex + modalBodyEndStr.length);

const inlineViewer = `
                  {selectedScan && selectedScan.id === scan.id && (
                    <tr className="mv-inline-detail-row">
                      <td colSpan="7" style={{ padding: 0 }}>
                        <div style={{ background: 'var(--bg-main)', borderTop: '1px solid var(--border-color)', borderBottom: '2px solid #3B82F6', overflow: 'hidden' }}>
                          <div style={{ padding: '1.5rem', maxHeight: '800px', overflowY: 'auto' }}>
                            ${modalInner}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
`;

// Inject inline viewer
const oldMapStart = '{history.map((scan) => (\n                <tr \n                  key={scan.id} \n                  onClick={() => handleRowClick(scan)} \n                  style={{ cursor: \'pointer\', transition: \'background-color 0.2s\' }}\n                >';
const newMapStart = '{history.map((scan) => (\n                <React.Fragment key={scan.id}>\n                <tr \n                  onClick={() => handleRowClick(scan)} \n                  style={{ cursor: \'pointer\', transition: \'background-color 0.2s\' }}\n                >';

bottomPanel = bottomPanel.replace(oldMapStart, newMapStart);

const rowEnd = '                </tr>\n              ))}';
const newRowEnd = '                </tr>\n' + inlineViewer + '              </React.Fragment>\n              ))}';
bottomPanel = bottomPanel.replace(rowEnd, newRowEnd);

// Assemble: Header -> Bottom Panel -> Top Grid -> End
const beforeTopGrid = content.substring(0, topGridStart);
const finalContent = beforeTopGrid + bottomPanel + '\n      ' + topGrid + '\n    </div>\n  );\n};\n\nexport default MobileVAPT;\n';

fs.writeFileSync(path, finalContent);
console.log("Done");
