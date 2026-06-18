import re

with open('/home/madhan/Desktop/ASM-New/frontend/src/components/MobileVAPT/MobileVAPT.jsx', 'r') as f:
    content = f.read()

# 1. Update handleRowClick
handle_click_old = """  // Click row -> Open Detail
  const handleRowClick = async (scan) => {
    setSelectedScan(scan);
    setLoadingDetail(true);
    setScanDetail(null);
    setActiveTab('Overview');"""

handle_click_new = """  // Click row -> Open Detail
  const handleRowClick = async (scan) => {
    if (selectedScan && selectedScan.id === scan.id) {
      setSelectedScan(null);
      setScanDetail(null);
      return;
    }
    setSelectedScan(scan);
    setLoadingDetail(true);
    setScanDetail(null);
    setActiveTab('Overview');"""

content = content.replace(handle_click_old, handle_click_new)

# 2. Extract Top Grid
top_grid_start = content.find("{/* Top Split Layout */}")
bottom_panel_start = content.find("{/* Bottom Panel: Recent Audits */}")
modal_start = content.find("{/* Detail Modal */}")
modal_end = content.find("</div>\n    </div>\n  );\n};\n\nexport default MobileVAPT;") + 6

if top_grid_start != -1 and bottom_panel_start != -1 and modal_start != -1:
    top_grid_html = content[top_grid_start:bottom_panel_start]
    bottom_panel_html = content[bottom_panel_start:modal_start]
    
    # We need to extract the modal tabs and body and inject them into the table
    modal_content = content[modal_start:modal_end]
    
    tabs_start = modal_content.find("{/* Tabs */}")
    modal_body_end = modal_content.rfind("</div>\n          </div>\n        </div>\n      )}")
    if tabs_start != -1 and modal_body_end != -1:
        tabs_and_body = modal_content[tabs_start:modal_body_end]
        # remove the extra "      </div>\n    </div>\n  );\n};" part from modal_body_end if any, wait, the rfind is specific enough.
        # Let's adjust the wrapper for tabs_and_body
        inline_viewer = f"""
                  {{selectedScan && selectedScan.id === scan.id && (
                    <tr className="mv-inline-detail-row" style={{ backgroundColor: 'var(--bg-main)' }}>
                      <td colSpan="7" style={{ padding: 0 }}>
                        <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '2px solid #3B82F6' }}>
                          {tabs_and_body}
                        </div>
                      </td>
                    </tr>
                  )}}
"""
        # Inject inline_viewer after the </tr> of the row map
        tr_end = bottom_panel_html.find("</tr>\n              ))}")
        if tr_end != -1:
            # We need to wrap the tr in React.Fragment
            tr_start = bottom_panel_html.find("<tr \n                  key={scan.id}")
            bottom_panel_html = bottom_panel_html[:tr_start] + "<React.Fragment key={scan.id}>\n                " + bottom_panel_html[tr_start:tr_end + 5] + inline_viewer + "              </React.Fragment>\n              ))}" + bottom_panel_html[tr_end + 20:]
            # Remove key from tr to avoid warnings
            bottom_panel_html = bottom_panel_html.replace("key={scan.id} \n                  onClick", "onClick")
            
    # Now reconstruct the layout
    # content = everything before top_grid + bottom_panel + top_grid + "</div>\n  );\n};\n\nexport default MobileVAPT;"
    
    new_content = content[:top_grid_start] + bottom_panel_html + "\n" + top_grid_html + "\n    </div>\n  );\n};\n\nexport default MobileVAPT;\n"
    
    with open('/home/madhan/Desktop/ASM-New/frontend/src/components/MobileVAPT/MobileVAPT.jsx', 'w') as f:
        f.write(new_content)
    print("Refactoring successful!")
else:
    print("Could not find markers!")

