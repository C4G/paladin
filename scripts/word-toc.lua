-- Lua filter to insert a native Word TOC field
-- This replaces pandoc's static ToC with a Word TOC field that is clickable
function Pandoc(doc)
  local hblocks = {}
  -- Insert a raw OpenXML TOC field at the beginning
  local toc = pandoc.RawBlock('openxml',
    '<w:sdt><w:sdtContent>'
    .. '<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r>'
    .. '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r>'
    .. '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
    .. '<w:r><w:t>Right-click here and select "Update Field" to generate Table of Contents</w:t></w:r>'
    .. '<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>'
    .. '</w:sdtContent></w:sdt>'
  )
  local title = pandoc.RawBlock('openxml',
    '<w:p><w:pPr><w:pStyle w:val="TOCHeading"/></w:pPr>'
    .. '<w:r><w:t>Contents</w:t></w:r></w:p>'
  )
  table.insert(hblocks, title)
  table.insert(hblocks, toc)
  for _, block in ipairs(doc.blocks) do
    table.insert(hblocks, block)
  end
  return pandoc.Pandoc(hblocks, doc.meta)
end
