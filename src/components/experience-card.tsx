interface ExperienceCardProps {
  jobTitle: string
  company: string
  location: string
  startDate: string
  endDate: string
  achievements: string[]
}

export default function ExperienceCard({
  jobTitle,
  company,
  location,
  startDate,
  endDate,
  achievements,
}: ExperienceCardProps) {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium text-black dark:text-white text-xl">{jobTitle}</h3>
          <p className="text-gray-700 dark:text-gray-300">
            {startDate} - {endDate}
          </p>
        </div>
        <div className="text-right">
          <p className="font-medium text-black dark:text-white">{company}</p>
          <p className="text-gray-700 dark:text-gray-300">{location}</p>
        </div>
      </div>

      <ul className="list-decimal pl-5 space-y-2 text-gray-800 dark:text-gray-200 mb-4">
        {achievements.map((achievement, index) => (
          <li key={index}>{achievement}</li>
        ))}
      </ul>

      <hr className="border-gray-200 dark:border-gray-700" />
    </div>
  )
}

