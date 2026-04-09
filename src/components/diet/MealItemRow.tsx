'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
  item: MealItem
  date: string
  mealType: string
  onDeleted: (id: string) => void
}

export default function MealItemRow({ item, date, mealType, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`"${item.food_name}"을(를) 삭제하시겠습니까?`)) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('meal_items').delete().eq('id', item.id)
    onDeleted(item.id)
    setDeleting(false)
  }

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      {/* 식품 정보 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">{item.food_name}</p>
        {item.amount_g && (
          <p className="text-xs text-text-muted mt-0.5 tabular-nums">{item.amount_g}g</p>
        )}
      </div>

      {/* 칼로리 + 매크로 */}
      <div className="text-right shrink-0">
        <p className="text-sm font-medium text-text-primary tabular-nums">
          {Math.round(item.calories ?? 0)}kcal
        </p>
        <p className="text-xs text-text-muted tabular-nums">
          P{Math.round(item.protein_g ?? 0)} C{Math.round(item.carbs_g ?? 0)} F{Math.round(item.fat_g ?? 0)}
        </p>
      </div>

      {/* 수정 / 삭제 버튼 */}
      <div className="flex items-center gap-1 shrink-0">
        <Link
          href={`/diet/add?date=${date}&meal=${encodeURIComponent(mealType)}&editId=${item.id}`}
          className="p-1.5 text-text-muted hover:text-accent transition-colors"
        >
          <Pencil size={13} />
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 text-text-muted hover:text-we-danger transition-colors disabled:opacity-40"
        >
          {deleting ? (
            <span className="text-[10px]">삭제 중</span>
          ) : (
            <Trash2 size={13} />
          )}
        </button>
      </div>
    </div>
  )
}
