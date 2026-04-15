import Link from 'next/link';
import React from 'react'
import { Mail, FileText,ExternalLink,  } from "lucide-react"
import { FaLinkedin as Linkedin, FaTwitter as Twitter, FaGithub as Github, FaInstagram as Instagram } from "react-icons/fa"
import { cx } from 'class-variance-authority';

type Props = {
    sm?: boolean;
}

const SocialLinks = ({ sm }: Props) => {

    {/* Social Media Icons */ }
    if (sm) {
        return (
            <div className="flex justify-center space-x-5 mb-6">
                <LinkedInComponent sm />
                <TwitterComponent sm />
                <MailComponent sm />
                <GithubComponent sm />
                <InstagramComponent sm />

            </div>
        )
    }

    return (
        <div className="flex space-x-6 mb-6">
            <LinkedInComponent />
            <TwitterComponent />
            <MailComponent />
            <GithubComponent />
            <InstagramComponent />
            <ExternalLinkComponent />
        </div>
    )
}

const LinkedInComponent = ({ sm }: Props) => {
    return (
        <Link href="https://www.linkedin.com/in/ashish-kr-mahto-647a86390/" target="_blank" aria-label="LinkedIn" className={cx(!sm ? "p-2 rounded-full border border-gray-300 dark:border-gray-700" : "", "hover:scale-110 transition-all duration-300")}>
            <Linkedin className=" w-5 h-5" />
        </Link>
    )
}

const TwitterComponent = ({ sm }: Props) => {
    return (
        <Link href="https://x.com/AshishKrMahto" target="_blank" aria-label="Twitter/X" className={cx(!sm ? "p-2 rounded-full border border-gray-300 dark:border-gray-700" : "", "hover:scale-110 transition-all duration-300")}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
                <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
            </svg>
        </Link>
    )
}

const MailComponent = ({ sm }: Props) => {
    return (
        <Link
            href="mailto:ashishkmahto98@gmail.com"
            aria-label="Email"
            className={cx(!sm ? "p-2 rounded-full border border-gray-300 dark:border-gray-700" : "", "hover:scale-110 transition-all duration-300")}
        >
            <Mail className="w-5 h-5" />
        </Link>
    )
}

const GithubComponent = ({ sm }: Props) => {
    return (
        <Link
            href="https://github.com/AshishM9301"
            target="_blank"
            aria-label="GitHub"
            className={cx(!sm ? "p-2 rounded-full border border-gray-300 dark:border-gray-700" : "", "hover:scale-110 transition-all duration-300")}
        >
            <Github className="w-5 h-5" />
        </Link>
    )
}

const InstagramComponent = ({ sm }: Props) => {
    return (
        <Link
            href="https://www.instagram.com/ashish13005/"
            target="_blank"
            aria-label="Instagram"
            className={cx(!sm ? "p-2 rounded-full border border-gray-300 dark:border-gray-700" : "", "hover:scale-110 transition-all duration-300")}
        >
            <Instagram className="w-5 h-5" />
        </Link>
    )
}


const ExternalLinkComponent = ({ sm }: Props) => {
    return (
        <Link
            href="https://ashishmahto.com"
            target="_blank"
            aria-label="External Link"
            className={cx(!sm ? "p-2 rounded-full border border-gray-300 dark:border-gray-700" : "", "hover:scale-110 transition-all duration-300")}
        >
            <ExternalLink className="w-5 h-5" />
        </Link>
    )
}

export default SocialLinks