import React, { useState } from 'react';
import {
  Box,
  Button,
  Code,
  Heading,
  Text,
} from '@chakra-ui/react';
import { useToast } from '@chakra-ui/toast';
import { Copy, Check } from 'lucide-react';

interface URLPreviewProps {
  url: string;
}

const URLPreview: React.FC<URLPreviewProps> = ({ url }) => {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'URL copied to clipboard',
        status: 'success',
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: 'Error',
        description: 'Failed to copy URL',
        status: 'error',
        duration: 2000,
      });
    }
  };

  if (!url) {
    return (
      <Box bg="white" borderRadius="lg" boxShadow="md" p={8} textAlign="center">
        <Text color="gray.500">Complete the form above to generate a tagged URL</Text>
      </Box>
    );
  }

  return (
    <Box bg="white" borderRadius="lg" boxShadow="md" p={8}>
      <Heading as="h2" size="lg" mb={4} color="gray.900">
        Your Campaign URL
      </Heading>

      <Box bg="gray.100" p={4} borderRadius="md" mb={6} overflowX="auto">
        <Code
          p={3}
          borderRadius="md"
          bg="gray.50"
          fontSize="sm"
          fontFamily="mono"
          color="gray.800"
          whiteSpace="pre-wrap"
          wordBreak="break-all"
        >
          {url}
        </Code>
      </Box>

      <Box display="flex" gap={3}>
        <Button
          colorScheme={copied ? 'green' : 'blue'}
          onClick={handleCopyUrl}
          size="lg"
          fontWeight="semibold"
          display="flex"
          alignItems="center"
          gap={2}
        >
          {copied ? <Check size={20} /> : <Copy size={20} />}
          {copied ? 'Copied!' : 'Copy URL'}
        </Button>
      </Box>

      <Box mt={6} p={4} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.500">
        <Text fontSize="sm" color="blue.900">
          <strong>Tip:</strong> Share this URL in your campaign materials, email signatures, or social media posts.
          UTM parameters will automatically track engagement in your analytics.
        </Text>
      </Box>
    </Box>
  );
};

export default URLPreview;
