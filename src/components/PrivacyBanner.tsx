import React from 'react';
import { Box, Container, Text, Icon, Flex } from '@chakra-ui/react';
import { Shield } from 'lucide-react';

const PrivacyBanner: React.FC = () => {
  return (
    <Box bg="blue.100" borderBottomWidth={2} borderBottomColor="blue.300" py={4}>
      <Container maxW="7xl" px={4}>
        <Flex gap={3}>
          <Icon as={Shield} color="blue.900" w={6} h={6} mt={0.5} flexShrink={0} />
          <Box>
            <Text fontWeight="semibold" fontSize="base" color="blue.900">
              Privacy First
            </Text>
            <Text fontSize="sm" color="blue.900" mt={1}>
              This is a client-side tool. No data is stored on our servers. Refreshing the page will clear all inputs.
            </Text>
          </Box>
        </Flex>
      </Container>
    </Box>
  );
};

export default PrivacyBanner;
