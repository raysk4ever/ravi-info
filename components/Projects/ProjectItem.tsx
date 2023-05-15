import { Image } from '@/styled'
import React, { useCallback } from 'react'
import { IconType } from 'react-icons/lib'
import { styled } from 'styled-components'

interface ProjectItemProps {
  name: string
  image: string
  demo?: string,
  tech: IconType[]
  isInternalTool?: boolean
  desc: string
}
const ProjectItem = ({ name, image, demo, tech, isInternalTool, desc }: ProjectItemProps) => {
  const handleOnDemoClick = useCallback((url: string | undefined) => () => {
    if (!url) {
      return
    }
    window.open(url, '_blank')
  }, [])
  return (
    <ItemWrapper>
      <p>{name}</p>
      <Image src={image} alt={`${name}-logo`} />
      <ContentWrapper>
        <IconList>
          {tech.map((Icon, i) => ( <Icon size={20} key={i} /> ))}
        </IconList>
        <span>{desc}</span>
      </ContentWrapper>
      {<DemoBtn isInternalTool={isInternalTool} onClick={handleOnDemoClick(demo)}>{isInternalTool ? 'Internal Tool': 'Demo'}</DemoBtn>}
    </ItemWrapper>
  )
}

export default ProjectItem


const ItemWrapper = styled.div`
  background-color: #009688;
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  color: white;
  width: 250px;
  margin: 10px 0px;
  cursor: pointer;
  img {
    height: 60%;
  }
  p {
    padding: 1rem;
  }
`
const ContentWrapper = styled.div`
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`
const IconList = styled.div`
  display: flex;
  gap: 1rem;
`

const DemoBtn = styled.div`
  text-align: center;
  padding: 5px 0px;
  background-color: ${p => p.isInternalTool ? '#5f06736': '#5f0673bd'};
  border-radius: 10px;
  cursor: pointer;
  margin: 10px;
  margin-top: auto;
`
