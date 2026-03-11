import React from 'react';
import {
  Box,
  Input,
  Heading,
  Grid,
  GridItem,
  Text,
} from '@chakra-ui/react';
import { FormControl, FormLabel } from '@chakra-ui/form-control';
import { Checkbox } from '@chakra-ui/checkbox';
import { 
  Instagram, 
  Facebook, 
  Linkedin, 
  Music, 
  Youtube,
  Twitter,
  Mail,
} from 'lucide-react';

interface FormSectionProps {
  formData: {
    targetUrl: string;
    channel: string;
    addPodcast: boolean;
    podcastName: string;
    addEvent: boolean;
    eventName: string;
    motivationAngle: string[];
    searchContext: string[];
  };
  onFormChange: (updates: any) => void;
}

const PLATFORMS = [
  { id: 'Instagram', label: 'Instagram', icon: Instagram, color: '#E4405F' },
  { id: 'Facebook', label: 'Facebook', icon: Facebook, color: '#1877F2' },
  { id: 'LinkedIn', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  { id: 'TikTok', label: 'TikTok', icon: Music, color: '#000000' },
  { id: 'YouTube', label: 'YouTube', icon: Youtube, color: '#FF0000' },
  { id: 'X', label: 'X (Twitter)', icon: Twitter, color: '#000000' },
  { id: 'Substack', label: 'Substack', icon: Mail, color: '#FF6D00' },
];

const MOTIVATION_OPTIONS = [
  'Educational',
  'Financial Incentive',
  'Altruistic/Community',
  'Personal Health',
];

const SEARCH_OPTIONS = [
  { id: 'self', label: 'Looking for self' },
  { id: 'others', label: 'Looking for someone else' },
];

const FormSection: React.FC<FormSectionProps> = ({ formData, onFormChange }) => {
  const handleInputChange = (field: string, value: any) => {
    onFormChange({ [field]: value });
  };

  const toggleMotivationAngle = (angle: string) => {
    const updated = formData.motivationAngle.includes(angle)
      ? formData.motivationAngle.filter(a => a !== angle)
      : [...formData.motivationAngle, angle];
    handleInputChange('motivationAngle', updated);
  };

  const toggleSearchContext = (context: string) => {
    const updated = formData.searchContext.includes(context)
      ? formData.searchContext.filter(c => c !== context)
      : [...formData.searchContext, context];
    handleInputChange('searchContext', updated);
  };

  return (
    <Box bg="white" borderRadius="lg" boxShadow="md" p={8}>
      <Heading 
        as="h2" 
        size="lg" 
        mb={2}
        color="gray.900"
        fontWeight="bold"
      >
        Campaign Configuration
      </Heading>
      <Text color="gray.600" mb={8} fontSize="sm">
        Set up your marketing attribution parameters and select your campaign channels
      </Text>

      <Box>
        {/* Target URL */}
        <FormControl isRequired mb={8}>
          <FormLabel 
            fontWeight="bold" 
            fontSize="md"
            color="gray.900" 
            mb={2}
            display="block"
          >
            Target URL
          </FormLabel>
          <Text fontSize="xs" color="gray.600" mb={3}>
            The landing page or destination URL for your campaign
          </Text>
          <Input
            type="url"
            value={formData.targetUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('targetUrl', e.target.value)}
            placeholder="https://www.trialme.com/landing"
            size="lg"
            borderColor="gray.300"
          />
        </FormControl>

        {/* Channel Selection - Platform Logos */}
        <FormControl mb={10}>
          <FormLabel 
            fontWeight="bold" 
            fontSize="md"
            color="gray.900" 
            mb={4}
            display="block"
          >
            Select Channel
          </FormLabel>
          <Text fontSize="sm" color="gray.600" mb={4}>
            Choose the social media platform for your campaign
          </Text>
          <Grid templateColumns={{ base: 'repeat(3, 1fr)', sm: 'repeat(4, 1fr)', lg: 'repeat(7, 1fr)' }} gap={3}>
            <GridItem>
              <Box
                as="button"
                onClick={() => handleInputChange('channel', '')}
                p={3}
                borderWidth={2}
                borderRadius="full"
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                gap={1}
                cursor="pointer"
                transition="all 0.2s"
                w={20}
                h={20}
                borderColor={formData.channel === '' ? 'red.400' : 'gray.300'}
                bg={formData.channel === '' ? 'gray.50' : 'white'}
                boxShadow={formData.channel === '' ? '0 0 0 3px rgba(245, 101, 101, 0.2)' : 'none'}
                _hover={{
                  borderColor: 'red.400',
                  boxShadow: '0 0 0 2px rgba(245, 101, 101, 0.2)',
                  transform: 'scale(1.05)',
                }}
              >
                <Box fontSize="2xl">✕</Box>
              </Box>
              <Text 
                fontSize="xs" 
                fontWeight="medium"
                color="gray.700"
                textAlign="center"
                mt={1}
              >
                None
              </Text>
            </GridItem>
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const isSelected = formData.channel === platform.id;
              return (
                <GridItem key={platform.id}>
                  <Box
                    as="button"
                    onClick={() => handleInputChange('channel', platform.id)}
                    p={3}
                    borderWidth={2}
                    borderRadius="full"
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    gap={1}
                    cursor="pointer"
                    transition="all 0.2s"
                    w={20}
                    h={20}
                    borderColor={isSelected ? platform.color : 'gray.300'}
                    bg={isSelected ? 'gray.50' : 'white'}
                    boxShadow={isSelected ? `0 0 0 3px ${platform.color}33` : 'none'}
                    _hover={{
                      borderColor: platform.color,
                      boxShadow: `0 0 0 2px ${platform.color}33`,
                      transform: 'scale(1.05)',
                    }}
                  >
                    <Icon size={24} color={platform.color} strokeWidth={1.5} />
                  </Box>
                  <Text 
                    fontSize="xs" 
                    fontWeight="medium"
                    color="gray.700"
                    textAlign="center"
                    mt={1}
                  >
                    {platform.label}
                  </Text>
                </GridItem>
              );
            })}
          </Grid>
        </FormControl>

        {/* External Sources - Podcast */}
        <Box bg="blue.50" p={4} borderRadius="md" mb={8} borderLeft="4px solid" borderColor="blue.400">
          <FormControl display="flex" alignItems="center" mb={formData.addPodcast ? 3 : 0}>
            <Checkbox
              isChecked={formData.addPodcast}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('addPodcast', e.target.checked)}
              colorScheme="blue"
              size="lg"
            >
              <FormLabel 
                mb={0} 
                fontWeight="semibold" 
                color="gray.900" 
                cursor="pointer"
                fontSize="md"
              >
                Add Podcast Attribution
              </FormLabel>
            </Checkbox>
          </FormControl>
          {formData.addPodcast && (
            <Box ml={8} mt={3}>
              <Text fontSize="xs" color="gray.600" mb={2}>
                Enter the podcast name
              </Text>
              <Input
                type="text"
                value={formData.podcastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('podcastName', e.target.value)}
                placeholder="Podcast Name"
                size="sm"
              />
            </Box>
          )}
        </Box>

        {/* External Sources - Live Event */}
        <Box bg="purple.50" p={4} borderRadius="md" mb={10} borderLeft="4px solid" borderColor="purple.400">
          <FormControl display="flex" alignItems="center" mb={formData.addEvent ? 3 : 0}>
            <Checkbox
              isChecked={formData.addEvent}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('addEvent', e.target.checked)}
              colorScheme="purple"
              size="lg"
            >
              <FormLabel 
                mb={0} 
                fontWeight="semibold" 
                color="gray.900" 
                cursor="pointer"
                fontSize="md"
              >
                Add Event Attribution
              </FormLabel>
            </Checkbox>
          </FormControl>
          {formData.addEvent && (
            <Box ml={8} mt={3}>
              <Text fontSize="xs" color="gray.600" mb={2}>
                Enter the event name or location
              </Text>
              <Input
                type="text"
                value={formData.eventName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('eventName', e.target.value)}
                placeholder="Event Name/Location"
                size="sm"
              />
            </Box>
          )}
        </Box>

        {/* Motivation Angle - Checkboxes */}
        <FormControl mb={10}>
          <FormLabel 
            fontWeight="bold" 
            fontSize="md"
            color="gray.900" 
            mb={3}
            display="block"
          >
            Motivation Angle
          </FormLabel>
          <Text fontSize="sm" color="gray.600" mb={4}>
            Select all that apply to your campaign
          </Text>
          <Box display="flex" flexDirection="column" gap={3}>
            {MOTIVATION_OPTIONS.map((angle) => (
              <Box 
                key={angle}
                display="flex" 
                alignItems="center"
                p={3}
                borderRadius="md"
                bg="white"
                borderWidth={1}
                borderColor={formData.motivationAngle.includes(angle) ? 'blue.200' : 'gray.200'}
                _hover={{ borderColor: 'blue.300', bg: 'gray.50' }}
                transition="all 0.2s"
                cursor="pointer"
                onClick={() => toggleMotivationAngle(angle)}
              >
                <Checkbox
                  isChecked={formData.motivationAngle.includes(angle)}
                  onChange={() => {}}
                  colorScheme="blue"
                  size="lg"
                  mr={4}
                  pointerEvents="none"
                />
                <FormLabel 
                  mb={0} 
                  color="gray.800" 
                  cursor="pointer" 
                  fontWeight="medium"
                  fontSize="md"
                  flex={1}
                >
                  {angle}
                </FormLabel>
              </Box>
            ))}
          </Box>
        </FormControl>

        {/* Search Context - Checkboxes */}
        <FormControl>
          <FormLabel 
            fontWeight="bold" 
            fontSize="md"
            color="gray.900" 
            mb={3}
            display="block"
          >
            Search Context
          </FormLabel>
          <Text fontSize="sm" color="gray.600" mb={4}>
            Select all that apply to your campaign
          </Text>
          <Box display="flex" flexDirection="column" gap={3}>
            {SEARCH_OPTIONS.map((option) => (
              <Box 
                key={option.id}
                display="flex" 
                alignItems="center"
                p={3}
                borderRadius="md"
                bg="white"
                borderWidth={1}
                borderColor={formData.searchContext.includes(option.id) ? 'blue.200' : 'gray.200'}
                _hover={{ borderColor: 'blue.300', bg: 'gray.50' }}
                transition="all 0.2s"
                cursor="pointer"
                onClick={() => toggleSearchContext(option.id)}
              >
                <Checkbox
                  isChecked={formData.searchContext.includes(option.id)}
                  onChange={() => {}}
                  colorScheme="blue"
                  size="lg"
                  mr={4}
                  pointerEvents="none"
                />
                <FormLabel 
                  mb={0} 
                  color="gray.800" 
                  cursor="pointer" 
                  fontWeight="medium"
                  fontSize="md"
                  flex={1}
                >
                  {option.label}
                </FormLabel>
              </Box>
            ))}
          </Box>
        </FormControl>
      </Box>
    </Box>
  );
};

export default FormSection;
