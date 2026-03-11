import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Box,
  Button,
  Heading,
  Input,
  Grid,
  GridItem,
  Text,
  Icon,
  Center,
} from '@chakra-ui/react';
import { useToast } from '@chakra-ui/toast';
import { FormControl, FormLabel } from '@chakra-ui/form-control';
import { Download, FileText, Upload, Palette } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface QRGeneratorProps {
  url: string;
}

const QRGenerator: React.FC<QRGeneratorProps> = ({ url }) => {
  const [bgColor, setBgColor] = useState('#ffffff');
  const [fgColor, setFgColor] = useState('#000000');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
        toast({
          title: 'Logo uploaded',
          status: 'success',
          duration: 2000,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadPNG = () => {
    if (qrCodeRef.current) {
      const canvas = qrCodeRef.current.querySelector('canvas') as HTMLCanvasElement;
      if (canvas) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'trialme-campaign-qr.png';
        link.click();
        toast({
          title: 'Downloaded',
          description: 'QR code saved as PNG',
          status: 'success',
          duration: 2000,
        });
      }
    }
  };

  const downloadPDF = async () => {
    if (qrRef.current) {
      try {
        const canvas = await html2canvas(qrRef.current, {
          backgroundColor: null,
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        pdf.setFontSize(16);
        pdf.text('TrialMe Campaign QR Code', pdfWidth / 2, 20, { align: 'center' });

        const imgWidth = 100;
        const imgHeight = 100;
        const x = (pdfWidth - imgWidth) / 2;
        const y = 50;
        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);

        pdf.setFontSize(10);
        pdf.text('Campaign URL:', 20, pdfHeight - 50);
        const urlText = pdf.splitTextToSize(url || 'No URL generated', pdfWidth - 40);
        pdf.text(urlText, 20, pdfHeight - 45);

        pdf.save('trialme-campaign-qr.pdf');
        toast({
          title: 'Downloaded',
          description: 'QR code exported as PDF',
          status: 'success',
          duration: 2000,
        });
      } catch (err) {
        console.error('Failed to generate PDF:', err);
        toast({
          title: 'Error',
          description: 'Failed to export PDF',
          status: 'error',
          duration: 2000,
        });
      }
    }
  };

  const removeLogo = () => {
    setLogoUrl(null);
    toast({
      title: 'Logo removed',
      status: 'info',
      duration: 1000,
    });
  };

  if (!url) {
    return (
      <Box bg="white" borderRadius="lg" boxShadow="md" p={8} textAlign="center">
        <Text color="gray.500">Enter a target URL and channel to generate a QR code</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Box bg="white" borderRadius="lg" boxShadow="md" p={8}>
        <Heading as="h2" size="lg" mb={6} color="gray.900">
          QR Code Generator
        </Heading>

        {/* QR Code Display */}
        <Center
          ref={qrRef}
          mb={6}
          p={4}
          borderRadius="md"
          bg={bgColor}
        >
          <Box position="relative" ref={qrCodeRef}>
            <QRCodeCanvas
              value={url}
              size={256}
              level="H"
              includeMargin={true}
              bgColor={bgColor}
              fgColor={fgColor}
            />
            {logoUrl && (
              <img
                src={logoUrl}
                alt="logo"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '4rem',
                  height: '4rem',
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  padding: '0.5rem',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
              />
            )}
          </Box>
        </Center>

        {/* Color Customization */}
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} mb={6}>
          <GridItem>
            <FormControl>
              <FormLabel fontWeight="semibold" color="gray.700" display="flex" alignItems="center" gap={2}>
                <Icon as={Palette} w={4} h={4} />
                Background Color
              </FormLabel>
              <Box display="flex" gap={2}>
                <Input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  w={16}
                  h={12}
                  borderRadius="md"
                  cursor="pointer"
                  p={1}
                />
                <Input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  size="sm"
                  fontFamily="mono"
                  flex={1}
                />
              </Box>
            </FormControl>
          </GridItem>

          <GridItem>
            <FormControl>
              <FormLabel fontWeight="semibold" color="gray.700" display="flex" alignItems="center" gap={2}>
                <Icon as={Palette} w={4} h={4} />
                Foreground Color
              </FormLabel>
              <Box display="flex" gap={2}>
                <Input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  w={16}
                  h={12}
                  borderRadius="md"
                  cursor="pointer"
                  p={1}
                />
                <Input
                  type="text"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  size="sm"
                  fontFamily="mono"
                  flex={1}
                />
              </Box>
            </FormControl>
          </GridItem>
        </Grid>

        {/* Logo Upload */}
        <Box bg="gray.100" p={4} borderRadius="md" mb={6}>
          <FormLabel fontWeight="semibold" color="gray.700" mb={3} display="flex" alignItems="center" gap={2}>
            <Icon as={Upload} w={4} h={4} />
            Logo Customization (Optional)
          </FormLabel>
          {!logoUrl ? (
            <Box
              as="label"
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
              p={4}
              borderWidth={2}
              borderStyle="dashed"
              borderColor="gray.300"
              borderRadius="md"
              cursor="pointer"
              _hover={{ borderColor: 'blue.500' }}
              transition="border-color 0.2s"
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
                id="logo-upload"
              />
              <Text fontSize="sm" color="gray.600" mb={1}>
                Click to upload logo
              </Text>
              <Text fontSize="xs" color="gray.500">
                PNG, JPG or GIF
              </Text>
            </Box>
          ) : (
            <Box display="flex" bg="white" p={3} borderRadius="md" borderWidth={1} borderColor="gray.300" justifyContent="space-between" alignItems="center">
              <Text fontSize="sm" color="gray.700">
                Logo uploaded successfully
              </Text>
              <Button colorScheme="red" size="sm" onClick={removeLogo}>
                Remove
              </Button>
            </Box>
          )}
        </Box>

        {/* Export Buttons */}
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3}>
          <Button
            colorScheme="green"
            size="lg"
            fontWeight="semibold"
            onClick={downloadPNG}
            display="flex"
            alignItems="center"
            gap={2}
          >
            <Download size={20} />
            Download PNG
          </Button>
          <Button
            colorScheme="red"
            size="lg"
            fontWeight="semibold"
            onClick={downloadPDF}
            display="flex"
            alignItems="center"
            gap={2}
          >
            <FileText size={20} />
            Export PDF
          </Button>
        </Grid>
      </Box>
    </Box>
  );
};

export default QRGenerator;
