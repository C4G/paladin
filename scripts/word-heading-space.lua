-- Manually number headings with a space separator for Word output
-- (pandoc's --number-sections concatenates number and text without a space in docx)

local counters = {0, 0, 0, 0, 0, 0}

function Header(el)
  local level = el.level

  -- Increment this level's counter
  counters[level] = counters[level] + 1

  -- Reset all deeper levels
  for i = level + 1, #counters do
    counters[i] = 0
  end

  -- Build the number string (e.g. "1.2.3")
  local parts = {}
  for i = 1, level do
    table.insert(parts, tostring(counters[i]))
  end
  local number = table.concat(parts, ".")

  -- Prepend "number " to the heading content
  local prefix = {pandoc.Str(number), pandoc.Space()}
  for _, item in ipairs(el.content) do
    table.insert(prefix, item)
  end
  el.content = prefix

  return el
end
