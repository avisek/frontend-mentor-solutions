import Header from './components/Header'
import ProfilePopover from './components/ProfilePopover'
import Solutions from './components/Solutions'
import ProfileImage from './components/ProfileImage'
import Icon from './components/Icon'
import AppIcon from './components/AppIcon'
import './App.scss'

function App() {
  
  return (
    <>
      <Header
        title={<>
          <span className="Squiggly">Frontend</span> Mentor Challenge Solutions
        </>}
        icon={
          <AppIcon/>
        }
        menu={
          <ProfilePopover
            icon={
              <ProfileImage size={48}/>
            }
            name="Avisek Das"
            hobby="Web Developer"
            links={[
              {
                title: 'GitHub',
                href: 'https://github.com/avisek',
                icon: <Icon icon={Icon.GITHUB}/>,
              },
              {
                title: 'Frontend Mentor',
                href: 'https://www.frontendmentor.io/profile/avisek',
                icon: <Icon icon={Icon.FRONTEND_MENTOR}/>,
              },
              {
                title: 'Project Repo',
                href: 'https://github.com/avisek/frontend-mentor-solutions',
                icon: <Icon icon={Icon.REPOSITORY}/>,
              },
              {
                title: 'Let\'s Connect',
                href: 'https://www.linkedin.com/in/avisek-das/',
                icon: <Icon icon={Icon.LINKEDIN}/>,
              },
              {
                title: 'Hire Me',
                href: 'mailto:avisekdas555@gmail.com',
                icon: <Icon icon={Icon.HIRE_ME}/>,
              },
            ]}
          />
        }
      />
      <main>
        <Solutions/>
      </main>
    </>
  )
}

export default App
