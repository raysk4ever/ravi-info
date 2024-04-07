import Image from 'next/image'
import React from 'react'
import { FaGithub, FaMedium, FaMediumM, FaStackOverflow, } from 'react-icons/fa'
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
      <Image alt='Epam Anywere Club' src='/epam_any.png' width={30} height={30} onClick={() => open('https://aw.club/global/en/blog/how-to-enhance-website-performance-with-next-js')}  />
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
  gap: 1rem;
  transition: all .1ms;
  svg {
    cursor: pointer;
    font-size: 30px;
  }
  & > *:hover {
    cursor: pointer;
    transform: scale(1.1);
  }
  /* On screens that are 600px or less, set the background color to olive */
  @media screen and (max-width: 600px) {
    width: 100vw;
    justify-content: center;
    margin-bottom: 34px;
    top: 40px;
    flex-direction : row;
  }
`
const MediumIcon = styled(FaMedium)`
  background-color: white;
  width: auto;
`