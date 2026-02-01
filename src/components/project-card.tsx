import Image from "next/image"
import Link from "next/link"

interface ProjectCardProps {
  title: string
  imageUrl: string
  description: string
  technologies: string[]
  demoUrl?: string
}

export default function ProjectCard({ title, imageUrl, description, technologies, demoUrl }: ProjectCardProps) {
  return (
    <div className="mb-12">
      <div className="mb-4">
        <div className="relative w-full h-96">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={`${title} screenshot`}
            fill
            className="w-full border border-gray-200 dark:border-gray-700 rounded-md object-contain"
          />
        </div>
      </div>

      <div className="mb-2">
        <h3 className="font-medium text-black dark:text-white">{title}</h3>
      </div>

      <div className="mb-3">
        {technologies.map((tech, index) => (
          <span
            key={index}
            className="inline-block bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm px-3 py-1 rounded mr-2"
          >
            {tech}
          </span>
        ))}
      </div>

      <p className="text-gray-700 dark:text-gray-300 mb-2">{description}</p>

      {demoUrl && (
        <Link
          href={demoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-700 dark:text-gray-300 hover:underline"
        >
          {demoUrl}
        </Link>
      )}

      <div className="mt-6 mb-2 flex justify-center">
        <div className="h-[1px] w-[80%] mx-auto bg-gray-200 dark:bg-gray-700 shadow-md"></div>
      </div>
    </div>
  )
}

