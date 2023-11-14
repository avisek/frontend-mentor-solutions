import { ReactNode } from "react"
import './Header.scss'

export interface HeaderProps {
  icon: ReactNode
  title: ReactNode
  menu: ReactNode
}

export default function Header({ icon, title, menu }: HeaderProps) {
  
  return (
    <header className="Header">
      <div className="Header_Inner">
        <div className="Header_Icon">
          {icon}
        </div>
        <h1 className="Header_Title">{title}</h1>
        <div className="Header_Menu">
          {menu}
        </div>
      </div>
    </header>
  )
}
