import { Image } from '@/styled'
import React, { useCallback } from 'react'
import { IconType } from 'react-icons/lib'
import { styled } from 'styled-components'

interface ProjectItemProps {
  name: string
  image?: string
  demo?: string,
  tech: IconType[]
  isInternalTool?: boolean
  desc?: string
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
      {/* <Image src={image} alt={`${name}-logo`} /> */}
      <ContentWrapper>
        <IconList>
          {tech.map((Icon, i) => ( <Icon size={20} key={i} /> ))}
        </IconList>
        <span>{desc}</span>
      </ContentWrapper>
    </ItemWrapper>
  )
}

export default ProjectItem


const ItemWrapper = styled.div`
  /* background-color: #009688; */
  background-color: rgba(var(--callout-rgb), 0.5);
  border: 1px solid rgba(var(--callout-border-rgb), 0.3);
  border-radius: var(--border-radius);
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  color: white;
  font-family: var(--font-mono);
  color: rgb(var(--foreground-rgb));
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

const DemoBtn = styled.div<{ isInternalTool: Boolean | undefined }>`
  text-align: center;
  padding: 5px 0px;
  background-color: ${p => p.isInternalTool ? '#5f06736': '#000000'};
  border-radius: 10px;
  cursor: pointer;
  margin: 10px;
  margin-top: auto;
`
