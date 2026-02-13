'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useCombobox } from 'downshift'
import styles from './Combobox.module.css'

interface ComboboxItem {
  id: string
  label: string
}

interface ComboboxProps {
  label: string
  id: string
  name: string
  placeholder?: string
  required?: boolean
  requiredMessage?: string
  onSearch: (query: string) => Promise<ComboboxItem[]>
  debounceMs?: number
}

export default function Combobox({
  label,
  id,
  name,
  placeholder,
  required = false,
  requiredMessage = 'Veuillez sélectionner un élément dans la liste.',
  onSearch,
  debounceMs = 300,
}: ComboboxProps) {
  const [items, setItems] = useState<ComboboxItem[]>([])
  const [selectedId, setSelectedId] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateValidity = useCallback(
    (hasSelection: boolean) => {
      if (!required || !inputRef.current) return
      inputRef.current.setCustomValidity(hasSelection ? '' : requiredMessage)
    },
    [required, requiredMessage],
  )

  const handleInputChange = useCallback(
    (inputValue: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)

      setSelectedId('')
      updateValidity(false)

      if (inputValue.length < 2) {
        setItems([])
        return
      }

      debounceRef.current = setTimeout(async () => {
        const results = await onSearch(inputValue)
        setItems(results)
      }, debounceMs)
    },
    [onSearch, debounceMs, updateValidity],
  )

  useEffect(() => {
    updateValidity(false)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [updateValidity])

  const {
    isOpen,
    getLabelProps,
    getMenuProps,
    getInputProps,
    getItemProps,
    highlightedIndex,
    selectedItem,
  } = useCombobox({
    items,
    itemToString: (item) => (item ? item.label : ''),
    onInputValueChange: ({ inputValue, type }) => {
      if (type === '__input_change__') {
        handleInputChange(inputValue ?? '')
      }
    },
    onSelectedItemChange: ({ selectedItem: item }) => {
      const newId = item ? item.id : ''
      setSelectedId(newId)
      updateValidity(!!newId)
    },
  })

  const inputProps = getInputProps({ placeholder, ref: inputRef })

  return (
    <div className={styles.field}>
      <label className={styles.label} {...getLabelProps()}>
        {label}
      </label>
      <div className={styles.inputWrapper}>
        <input className={styles.input} {...inputProps} required={required} />
        <input type="hidden" name={name} value={selectedId} />
      </div>
      <ul className={styles.menu} {...getMenuProps()}>
        {isOpen &&
          items.map((item, index) => (
            <li
              key={item.id}
              className={`${styles.item} ${highlightedIndex === index ? styles.highlighted : ''} ${selectedItem?.id === item.id ? styles.selected : ''}`}
              {...getItemProps({ item, index })}
            >
              {item.label}
            </li>
          ))}
      </ul>
    </div>
  )
}
