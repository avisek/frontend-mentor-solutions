import Icon from './Icon'
import './AppIcon.scss'

export interface AppIconProps {
  
}

export default function AppIcon({}: AppIconProps) {
  return (
    <Icon className="AppIcon" icon={Icon.FRONTEND_MENTOR}/>
  )
}
