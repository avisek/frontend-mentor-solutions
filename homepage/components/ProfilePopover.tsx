import type { ReactElement, ReactNode } from "react"
import Icon, { type IconProps } from "./Icon"
import './ProfilePopover.scss'

export interface ProfilePopoverLink {
  title: string
  href: string
  icon: ReactElement<IconProps, typeof Icon>
}

export interface ProfilePopoverProps {
  icon: ReactNode
  name: string
  hobby: string
  links: ProfilePopoverLink[]
}

export default function ProfilePopover({ icon, name, hobby, links }: ProfilePopoverProps) {
  
  return (
    <div className="ProfilePopover" tabIndex={0}>
      <div className="ProfilePopover_Trigger">
        {icon}
      </div>
      <div className="ProfilePopover_Popover">
        <div className="ProfilePopover_Header">
          <h2 className="ProfilePopover_Name">{name}</h2>
          <p className="ProfilePopover_Hobby">{hobby}</p>
        </div>
        <ul className="ProfilePopover_Links">
          {links.map(({ title, href, icon }) =>
            <li className="ProfilePopover_LinkWrapper" key={title + href}>
              <a className="ProfilePopover_Link" href={href} target="_blank">
                <span>{title}</span>
                {icon}
              </a>
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
