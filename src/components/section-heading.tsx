interface SectionHeadingProps {
  title: string
}

export default function SectionHeading({ title }: SectionHeadingProps) {
  return (
    <h2 className="text-lg font-medium text-black dark:text-white mb-4">
      {title}
      <div className="h-1 w-52 bg-black dark:bg-white mt-1"></div>
    </h2>
  )
}

