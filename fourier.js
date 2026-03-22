/* 
 * Various Fourier transform related functionality which replicates part of the
 * functionality provided by NumPy and SciPy.
 *
 * The FFT implementation in this file is adapted from Project Nayuki,
 * (http://www.nayuki.io/page/free-small-fft-in-multiple-languages)
 * as restructured by Chris Cannam (cannam@all-day-breakfast.com),
 * downloaded from https://code.soundsoftware.ac.uk/projects/js-dsp-test/repository/entry/fft/nayuki-obj/fft.js
 * under the MIT license.
 */
"use strict";

function nextpow2(num) {
    return 2**Math.ceil(Math.log2(Math.abs(num)));
}

class Fourier {

    /* 
     * Construct an object for calculating the discrete Fourier transform (DFT), where fftSize is a power of 2.
     */
    constructor(fftSize) {
        this.fftSize = fftSize;
        this.numPosBins = fftSize / 2 + 1;
        this.levels = Math.trunc(Math.log2(fftSize));
        if (Math.pow(2, this.levels) !== fftSize) {
            throw "The FFT size should be a power of 2";
        }

        this.cosTable = new Float64Array(fftSize / 2);
        this.sinTable = new Float64Array(fftSize / 2);
        for (let i = 0; i < fftSize / 2; i++) {
            this.cosTable[i] = Math.cos(2 * Math.PI * i / fftSize);
            this.sinTable[i] = Math.sin(2 * Math.PI * i / fftSize);
        }
    }

    /* 
     * Computes the discrete Fourier transform (DFT) of the given complex vector, storing the result back into the vector.
     * The vector's length must be equal to the fftSize that was passed to the object constructor, and this must be a power of 2.
     * Uses the Cooley-Tukey decimation-in-time radix-2 algorithm.
     */
    fft(real, imag) {
        // Returns the integer whose value is the reverse of the lowest 'bits' bits of the integer 'x'.
        function reverseBits(x, bits) {
            let y = 0;
            for (let i = 0; i < bits; i++) {
                y = (y << 1) | (x & 1);
                x >>>= 1;
            }
            return y;
        }

        const fftSize = this.fftSize;

        // Bit-reversed addressing permutation
        for (let i = 0; i < fftSize; i++) {
            const j = reverseBits(i, this.levels);
            if (j > i) {
                let temp = real[i];
                real[i] = real[j];
                real[j] = temp;
                temp = imag[i];
                imag[i] = imag[j];
                imag[j] = temp;
            }
        }

        // Cooley-Tukey decimation-in-time radix-2 FFT
        for (let size = 2; size <= fftSize; size *= 2) {
            const halfSize = size / 2;
            const tableStep = fftSize / size;
            for (let i = 0; i < fftSize; i += size) {
                for (let j = i, k = 0; j < i + halfSize; j++, k += tableStep) {
                    const tpre = real[j+halfSize] * this.cosTable[k] + imag[j+halfSize] * this.sinTable[k];
                    const tpim = -real[j+halfSize] * this.sinTable[k] + imag[j+halfSize] * this.cosTable[k];
                    real[j + halfSize] = real[j] - tpre;
                    imag[j + halfSize] = imag[j] - tpim;
                    real[j] += tpre;
                    imag[j] += tpim;
                }
            }
        }
    }

    ifft(real, imag) {
        this.fft(imag, real);
        const scaleFactor = this.fftSize;
        for (let i = 0; i < this.fftSize; ++i) {
            real[i] /= scaleFactor;
            imag[i] /= scaleFactor;
        }
    }

    powerSpectrum(realSamples) {
        const real = Array.from(realSamples).concat(new Array(this.fftSize-realSamples.length).fill(0));
        const imag = new Float64Array(this.fftSize).fill(0);
        this.fft(real, imag);

        const scaleFactor = Math.pow(this.fftSize, 2);
        const powerSpectrum = real.slice(0, this.numPosBins).map((el, idx) => (Math.pow(el, 2) + Math.pow(imag[idx], 2)) / scaleFactor);
        return powerSpectrum;
    }

    dBSpectrum(realSamples) {
        const dBSpectrum = this.powerSpectrum(realSamples).map(s => 10*Math.log10(Math.max(s, 1e-12)));
        return dBSpectrum;
    }

    magnitudeSpectrum(realSamples) {
        const magnitudeSpectrum = this.powerSpectrum(realSamples).map(s => Math.sqrt(s));
        return magnitudeSpectrum;
    }

    rfftFreqs(samplerate) {
        const freqResolution = samplerate / this.fftSize;
        return Float64Array.from({length: this.numPosBins}, (_, idx) => freqResolution * idx);
    }

    hilbert(realSamples) {
        const real = Array.from(realSamples).concat(new Array(this.fftSize-realSamples.length).fill(0));
        const imag = new Float64Array(this.fftSize).fill(0);
        this.fft(real, imag);

        const halfN = this.fftSize / 2;
        let h = new Array(halfN).fill(2).concat(new Array(halfN).fill(0));
        h[0] = 1;
        h[halfN] = 1;

        let hilbertReal = real.map((el, idx) => el * h[idx]);
        let hilbertImag = imag.map((el, idx) => el * h[idx]);
        this.ifft(hilbertReal, hilbertImag);
        return {hilbertReal, hilbertImag};
    }

    envelope(realSamples) {
        const dcOffset = realSamples.reduce((partialSum, el) => partialSum + el, 0) / realSamples.length;
        const dcRemoved = realSamples.map(el => el - dcOffset);
        const {hilbertReal, hilbertImag} = this.hilbert(dcRemoved);
        const envelope = hilbertReal.map((el, idx) => Math.sqrt(Math.pow(el, 2) + Math.pow(hilbertImag[idx], 2)) + dcOffset);
        return envelope;
    }
}
