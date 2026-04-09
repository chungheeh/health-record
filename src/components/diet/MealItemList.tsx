'use client'

import { useState } from 'react'
import Link from 'next/link'
import MealItemRow from './MealItemRow'

interface MealItem {
  id: string
  food_name: string
  amount_g: number | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

interface Props {
  items: MealItem[]
  date: string
  mealType: string
}

export default function MealItemList({ items: initialItems, date, mealType }: Props) {
  const [items, setItems] = useState<MealItem[]>(initialItems)

  const handleDeleted = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-4 text-center">
        <Link
          href={`/diet/add?date=${date}&meal=${encodeURIComponent(mealType)}`}
          className="text-xs text-text-muted"
        >
          + 음식 추가
        </Link>
      </div>
    )
  }

  return (
    <div className="divide-y divide-we-border">
      {items.map(item => (
        <MealItemRow
          key={item.id}
          item={item}
          date={date}
          mealType={mealType}
          onDeleted={handleDeleted}
        />
      ))}
    </div>
  )
}
