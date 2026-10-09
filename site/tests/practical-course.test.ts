import {describe,it,expect} from 'vitest';
import {getMessages,validateMessageCatalog} from '../src/i18n';
import {COURSE_HOME_MESSAGE_KEYS,COURSE_INDEX_MESSAGE_KEYS,courseMessageKeys,hasCourseHomeMessages,hasCourseIndexMessages,hasCourseMessages} from '../src/i18n/messages';

describe('independent optional course message groups',()=>{
  it('shares a single exact union of nine home keys and two index keys',()=>{
    expect(COURSE_HOME_MESSAGE_KEYS).toHaveLength(9);
    expect(COURSE_INDEX_MESSAGE_KEYS).toHaveLength(2);
    expect(new Set(courseMessageKeys).size).toBe(11);
    expect(hasCourseMessages(getMessages('en'))).toBe(true);
  });
  it('home can activate without introducing an inactive practical index translation',()=>{
    const home={...getMessages('en')};
    for(const key of COURSE_INDEX_MESSAGE_KEYS)delete home[key];
    expect(()=>validateMessageCatalog(home)).not.toThrow();
    expect(hasCourseHomeMessages(home)).toBe(true);
    expect(hasCourseIndexMessages(home)).toBe(false);
    expect(hasCourseMessages(home)).toBe(false);
  });
  it('each optional group rejects partial, blank and unknown values independently',()=>{
    for(const keys of [COURSE_HOME_MESSAGE_KEYS,COURSE_INDEX_MESSAGE_KEYS]){
      const partial={...getMessages('en')};delete partial[keys[0]];
      expect(()=>validateMessageCatalog(partial)).toThrow(/complete course/);
      expect(()=>validateMessageCatalog({...getMessages('en'),[keys[0]]:' '})).toThrow(/non-empty/);
    }
    expect(()=>validateMessageCatalog({...getMessages('en'),privateExtra:'extra'})).toThrow(/keys must be exactly/);
  });
});
