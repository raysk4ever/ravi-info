import React from 'react'
import { FaGithub, FaMedium, FaMediumM, FaStackOverflow } from 'react-icons/fa'
import { SiLinkedin, SiMedium } from 'react-icons/si'
import { styled } from 'styled-components'

const Links = () => {
  const open = (url: string) => {
    window.open(url, '_blank')
  }
  return (
    <LinksContainer>
      <FaGithub onClick={() => open('https://github.com/raysk4ever/')} />
      <FaStackOverflow color='#EC761E' onClick={() => open('https://stackoverflow.com/users/11216915/ravi-singh')} />
      <SiLinkedin color='#0177B5' onClick={() => open('https://www.linkedin.com/in/ravi-raysk/')} />
      <MediumIcon color='#000' onClick={() => open('https://medium.com/@kissmi')} />
    </LinksContainer>
  )
}

export default Links

const LinksContainer = styled.div`
  position: absolute;
  border-radius: 20px;
  width: 50px;
  height: 200px;
  left: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0px;
  gap: 1rem;
  svg {
    cursor: pointer;
    font-size: 30px;
  }
`
const MediumIcon = styled(FaMedium)`
  background-color: white;
`