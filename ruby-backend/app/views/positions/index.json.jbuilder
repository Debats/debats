json.array!(@positions) do |position|
  json.extract! position, :title, :id
end