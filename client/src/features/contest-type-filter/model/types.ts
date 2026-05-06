export type ContestTypeFilterOption = {
  id: string
  label: string
}

export type ContestTypeFilterProps = {
  options: ContestTypeFilterOption[]
  selectedType: string
  selectedTitle: string
  isOpen: boolean
  onToggle: () => void
  onSelect: (typeId: string) => void
}
