import Link from "next/link"
import { Mail, FileText, Linkedin, Instagram, ExternalLink, Github } from "lucide-react"
import { Caveat } from "next/font/google"
import SectionHeading from "@/components/section-heading"
import ExperienceCard from "@/components/experience-card"
import ProjectList from "@/components/project-list"
import SkillTag from "@/components/skill-tag"
import BlogCard from "@/components/blog-card"
import { ThemeToggle } from "@/components/theme-toggle"
import SocialLinks from "./_components/social-links"

// Caveat is one of the closest Google Fonts to Figma Hand
const handwrittenFont = Caveat({ subsets: ["latin"], weight: ["700"] })

export default function Home() {
  // Experience data
  const experiences = [
    {
      jobTitle: "Application Programmer",
      company: "Web Spiders (India) Pvt. Ltd",
      location: "Kolkata",
      startDate: "March 2024",
      endDate: "April 2025",
      achievements: [
        "Improved performance and functioning by migrating React Native app from Expo to CLI, increasing user satisfaction by 20%.",
        "Optimized performance in Flutter applications, achieving faster load times and fluid transitions.",
        "Engineered a CRM application using Next JS to enhance user experience and optimize performance",
      ],
    },
    {
      jobTitle: "Frontend Developer",
      company: "OKAB",
      location: "Kolkata",
      startDate: "January 2023",
      endDate: "February 2024",
      achievements: [
        "Enhanced app performance by integrating lightweight frameworks and optimizing code, achieving a 15% faster response time.",
        "Engineered a responsive fashion website using modern web frameworks to enhance cross-device compatibility and user experience.",
      ],
    },
    {
      jobTitle: "Software Development Engineer",
      company: "SimbaQuartz",
      location: "Remote",
      startDate: "April 2022",
      endDate: "November 2022",
      achievements: [
        "Designed APIs with multi-level user authentication utilizing MongoDB, Node.js, and Express.js, streamlining login processes across platforms.",
      ],
    },
    {
      jobTitle: "Web Developer",
      company: "SimbaQuartz",
      location: "Mohali, Punjab",
      startDate: "March 2021",
      endDate: "October 2021",
      achievements: [
        "Developed cross-platform mobile applications using React Native and Flutter, ensuring compatibility with iOS and Android environments.",
      ],
    },
    {
      jobTitle: "Junior Intern - MERN Stack",
      company: "Thumbstack",
      location: "Remote",
      startDate: "September 2020",
      endDate: "March 2021",
      achievements: [
        "Using React Native to Develop app for cross Platform App.",
        "Implemented WebRTC to facilitate communication between app and web application, creating features such as polls and background removal using advanced JavaScript techniques.",
      ],
    },
  ]

  // Blogs data
  const blogs = [
    {
      title: "Basic Backend Setup — MERN",
      date: "June 15, 2023",
      description: "A comprehensive guide to setting up a MERN stack backend for your web applications.",
      technologies: ["Postgress", "NodeJS", "ExpressJS", "MongoDB"],
    },
    {
      title: "Building RESTful APIs with Node.js",
      date: "April 22, 2023",
      description: "Learn how to create robust and scalable RESTful APIs using Node.js and Express.",
      technologies: ["NodeJS", "ExpressJS", "REST API", "JWT"],
    },
    {
      title: "React Native vs Flutter: A Comparison",
      date: "March 10, 2023",
      description: "An in-depth comparison of React Native and Flutter for cross-platform mobile app development.",
      technologies: ["React Native", "Flutter", "Dart", "JavaScript"],
    },
  ]

  // Skills data
  const skillsRow1 = ["React Native", "React", "Node.JS", "ExpressJS", "MongoDB"]
  const skillsRow2 = ["Flutter", "Postgress", "WebRTC", "Dart", "NextJS"]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header id="header" className="mb-12 text-center">
        <h1 className={`text-4xl mb-3 ${handwrittenFont.className} font-bold`}>Ashish Kumar Mahto</h1>

        <SocialLinks sm />

        {/* Navigation Bar */}
        <nav className="border border-gray-200 dark:border-gray-700 rounded-md w-full bg-gray-50 dark:bg-gray-800 shadow-md sticky top-0 z-10">
          <div className="flex justify-between items-center px-6 py-2">
            <a href="#header" className="font-bold">
              Home
            </a>
            <a href="#experience" className="hover:font-bold">
              Experience
            </a>
            <a href="#projects" className="hover:font-bold">
              Projects
            </a>
            <a href="#skills" className="hover:font-bold">
              Skills
            </a>
            <a href="#youtube" className="hover:font-bold">
              Logs
            </a>
            <a href="#blogs" className="hover:font-bold">
              Blogs
            </a>
            <a
              href="#"
              className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Resume
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </nav>
      </header>

      {/* Professional Summary */}
      <div className="mb-10 text-lg text-gray-800 dark:text-gray-200 leading-relaxed">
        <p>
          Application Developer who turns ideas into seamless apps. Master of React, React Native, Flutter, and a
          back-end architect with Node.js, Express, MongoDB, and PostgreSQL. Agile, efficient, and all about crafting
          impactful experiences
        </p>
      </div>

      <section id="experience" className="mb-10 scroll-mt-16">
        <SectionHeading title="Experience" />

        {experiences.map((exp, index) => (
          <ExperienceCard
            key={index}
            jobTitle={exp.jobTitle}
            company={exp.company}
            location={exp.location}
            startDate={exp.startDate}
            endDate={exp.endDate}
            achievements={exp.achievements}
          />
        ))}
      </section>

      <section id="projects" className="mb-10 scroll-mt-16">
        <SectionHeading title="Projects" />
        <ProjectList />
      </section>

      <section id="youtube" className="mb-10 scroll-mt-16">
        <SectionHeading title="Youtube" />
        <div className="mb-4">
          <div className="flex justify-center flex-wrap gap-4 mb-4">
            <iframe
              width="560"
              height="315"
              src="https://www.youtube.com/embed/videoseries?list=PLLzugsgRPpFWW4qZfS-QWcI1YPZgl39d1"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      <section id="skills" className="mb-10 scroll-mt-16">
        <SectionHeading title="Skills" />
        <div className="mb-4">
          <div className="flex justify-center flex-wrap gap-4 mb-4">
            {skillsRow1.map((skill, index) => (
              <SkillTag key={index} name={skill} />
            ))}
          </div>
          <div className="flex justify-center flex-wrap gap-4">
            {skillsRow2.map((skill, index) => (
              <SkillTag key={index} name={skill} />
            ))}
          </div>
        </div>
      </section>

      <section id="blogs" className="mb-10 scroll-mt-16">
        <SectionHeading title="Blogs" />
        {blogs.map((blog, index) => (
          <BlogCard
            key={index}
            title={blog.title}
            date={blog.date}
            description={blog.description}
            technologies={blog.technologies}
          />
        ))}
      </section>

      <section id="education" className="mb-10 scroll-mt-16">
        <SectionHeading title="Education" />
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <h3 className="font-medium">Bachelor of Technology in Mechanical Engineering</h3>
            <span className="text-sm text-gray-600 dark:text-gray-400">2016 - 2020</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">KIIT, Bhubaneswar</p>
        </div>
      </section>

      <section id="contact" className="mb-10 scroll-mt-16">
        <SectionHeading title="Contact" />

        <p className="mb-4 text-gray-800 dark:text-gray-200">
          Feel free to contact to my{" "}
          <a
            href="mailto:ashishkmahto98@gmail.com"
            className="underline hover:text-gray-600 dark:hover:text-gray-400"
          >
            ashishkmahto98@gmail.com
          </a>
        </p>

        <SocialLinks />

        <hr className="border-gray-300 dark:border-gray-700 mb-4" />

        <div className="flex justify-between items-center">
          <span className="text-gray-700 dark:text-gray-300">@ashish</span>
          <div className="theme-toggle-wrapper">
            <ThemeToggle />
          </div>
        </div>
      </section>

      <footer className="text-center text-sm text-gray-500 dark:text-gray-400 mt-16">
        <p>© {new Date().getFullYear()} Ashish Kumar Mahto. All rights reserved.</p>
      </footer>
    </div>
  )
}
