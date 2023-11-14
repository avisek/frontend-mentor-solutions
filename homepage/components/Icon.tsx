import React, { ReactElement } from 'react'
import cn from 'classnames'
import './Icon.scss'

const icons = {
  FRONTEND_MENTOR: (
    <svg className="Icon" viewBox="0 0 24 24">
      <path d="M11.625 5.625L11.625 16.5"/>
      <path d="M19.875 8.625L15 10.875L19.875 13.125"/>
      <path d="M13.5 21C8.25 21 3.75 17.25 2.625 12.75"/>
    </svg>
  ),
  GITHUB: (
    <svg className="Icon" viewBox="0 0 24 24">
      <path d="M14.6722 15.2384C15.8741 14.9886 16.9646 14.5555 17.8123 13.9197C19.2601 12.8339 20 11.1568 20 9.5C20 8.3377 19.5593 7.25255 18.7964 6.33345C18.3713 5.8213 19.6148 2.00001 18.51 2.51466C17.4053 3.02931 15.7854 4.16845 14.9363 3.91705C14.0273 3.64788 13.0366 3.5 12 3.5C11.0996 3.5 10.234 3.61156 9.4263 3.81726C8.2523 4.11624 7.12955 3.00001 6 2.51466C4.87043 2.02931 5.4868 5.98165 5.1513 6.3973C4.42059 7.3026 4 8.36445 4 9.5C4 11.1568 4.89543 12.8339 6.34315 13.9197C7.30755 14.6429 8.517 15.1039 9.87005 15.3311"/>
      <path d="M9.8701 15.331C9.29085 15.9686 9.0012 16.574 9.0012 17.1473C9.0012 17.7206 9.0012 19.1732 9.0012 21.5054"/>
      <path d="M14.6721 15.2383C15.221 15.9587 15.4955 16.6056 15.4955 17.1789C15.4955 17.7522 15.4955 19.1943 15.4955 21.5054"/>
      <path d="M3 15.6078C3.44943 15.6627 3.78277 15.8694 4 16.2278C4.32585 16.7652 5.5371 18.7591 6.91255 18.7591C7.82955 18.7591 8.52575 18.7591 9.0012 18.7591"/>
    </svg>
  ),
  REPOSITORY: (
    <svg className="Icon" viewBox="0 0 24 24">
      <path d="M4 18.5V5C4 3.89543 4.89543 3 6 3H18C19.1046 3 20 3.89543 20 5V13"/>
      <path d="M9 7H15"/>
      <path d="M10 16H6.5C5.11929 16 4 17.1193 4 18.5V18.5C4 19.8807 5.11929 21 6.5 21H10"/>
      <path d="M15.5 16L13 18.5L15.5 21"/>
      <path d="M18.5 16L21 18.5L18.5 21"/>
    </svg>
  ),
  LINKEDIN: (
    <svg className="Icon" viewBox="0 0 24 24">
      <path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"/>
      <path d="M8 11l0 5"/>
      <path d="M8 8l0 .01"/>
      <path d="M12 16l0 -5"/>
      <path d="M16 16v-3a2 2 0 0 0 -4 0"/>
    </svg>
  ),
  HIRE_ME: (
    <svg className="Icon" viewBox="0 0 24 24">
      <path d="M15 19.002L17.0024 21.0022L21 16.002"/>
      <path d="M3.75 21.0022C3.75 16.584 7.33503 13.002 11.7525 13.002C13.645 13.002 15.3846 13.6594 16.7551 14.7582"/>
      <path d="M15.2888 11.5378C14.3507 12.4753 13.0788 13.002 11.7525 13.002C10.4263 13.002 9.15437 12.4753 8.21631 11.5378C7.27824 10.6003 6.7508 9.32871 6.75 8.00249C6.75 6.67574 7.27706 5.40336 8.21521 4.46521C9.15336 3.52706 10.4258 3 11.7525 3C13.0793 3 14.3517 3.52706 15.2899 4.46521C16.228 5.40336 16.7551 6.67574 16.7551 8.00249C16.7543 9.32871 16.2268 10.6003 15.2888 11.5378Z"/>
    </svg>
  ),
} as const

const IconNames = Object.keys(icons).reduce((obj, IconName) => {
  (obj as Record<typeof IconName, typeof IconName>)[IconName] = IconName
  return obj
}, {} as { [K in keyof typeof icons]: K })

export interface IconProps {
  icon: keyof typeof IconNames | ReactElement
  className?: string
}

function IconComponent({ icon, className }: IconProps) {
  const Icon = typeof icon === 'string' ? icons[icon] : icon
  return React.cloneElement(Icon, {
    className: cn(Icon.props.className, className),
  })
}

const Icon = Object.assign(IconComponent, IconNames)

export default Icon
