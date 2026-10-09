import { Box, Collapse, Stack } from '@chakra-ui/react'
import { useState, type FC, type ReactNode } from 'react'

interface MobileSheetProps {
  /** Always visible, under the handle. */
  header: ReactNode
  children: ReactNode
}

/** Glass card over the globe. The handle folds the details away to show more of the Earth. */
export const MobileSheet: FC<MobileSheetProps> = ({ header, children }) => {
  const [open, setOpen] = useState(true)

  return (
    <Box
      position="relative"
      zIndex={2}
      bg="rgba(22, 22, 34, 0.72)"
      backdropFilter="blur(18px)"
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="3xl"
      px={4}
      pt={2}
      pb={5}
      boxShadow="0 -12px 40px rgba(0, 0, 0, 0.35)"
    >
      <Box
        as="button"
        type="button"
        aria-label={open ? 'Hide details' : 'Show details'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        display="block"
        w="full"
        py={2}
        mb={1}
      >
        <Box w="36px" h="4px" mx="auto" borderRadius="full" bg="whiteAlpha.400" />
      </Box>
      <Stack spacing={4}>
        {header}
        <Collapse in={open} animateOpacity>
          {children}
        </Collapse>
      </Stack>
    </Box>
  )
}
