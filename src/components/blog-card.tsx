"use client"

import { useState } from "react"

interface BlogCardProps {
  title: string
  date: string
  description: string
  technologies: string[]
}

export default function BlogCard({ title, date, description, technologies }: BlogCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={`mb-6 p-4 rounded-md transition-colors duration-200 ${isHovered ? "bg-gray-200 dark:bg-gray-800" : "bg-white dark:bg-gray-900"}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex justify-between mb-1">
        <h3 className="font-medium text-black dark:text-white">{title}</h3>
        <span className="text-sm text-gray-600 dark:text-gray-400">{date}</span>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{description}</p>

      <div className="flex flex-wrap gap-2 mt-2">
        {technologies.map((tech, index) => (
          <span
            key={index}
            className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs shadow-sm text-black dark:text-white"
          >
            {tech}
          </span>
        ))}
      </div>
    </div>
  )
}

