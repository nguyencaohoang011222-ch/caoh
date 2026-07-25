export interface VocabItemRaw {
  word: string;
  partOfSpeech: string;
  ipa: string;
  nghiaChinh: string;
  nghiaPhu?: string;
  dongNghia?: string;
  traiNghia?: string;
  tuLoaiKhac?: string;
  gioiTu?: string;
  collocations?: string;
  viDu: string[];
}

export interface VocabItem {
  id: string;
  word: string;
  partOfSpeech: string;
  ipa: string;
  nghiaChinh: string;
  nghiaPhu?: string;
  dongNghia?: string;
  traiNghia?: string;
  tuLoaiKhac?: string;
  gioiTu?: string;
  collocations?: string;
  viDu: string[];
}

export interface AnkiCardFormatted {
  id: string;
  front: string;
  back: string;
  raw: VocabItem;
}

export interface PresetList {
  name: string;
  description: string;
  words: string[];
}
