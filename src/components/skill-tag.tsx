interface SkillTagProps {
  name: string
}

export default function SkillTag({ name }: SkillTagProps) {
  return (
    <div className="w-[110px] px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm text-center text-sm text-black dark:text-white">
      {name}
    </div>
  )
}

